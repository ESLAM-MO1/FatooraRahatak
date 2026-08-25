using FatooraRahatak.Application.DTOs.Settlement;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Settlement;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Helpers;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class MerchantVerificationService : IMerchantVerificationService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;

    public MerchantVerificationService(AppDbContext context, IEmailService emailService)
    {
        _context = context;
        _emailService = emailService;
    }

    private Task<bool> StoreExistsAsync(long storeId) =>
        _context.Stores.AnyAsync(s => s.Id == storeId);

    private static readonly string[] AllowedTypes =
    {
        "CommercialRegister", "IdCard", "License", "VatCertificate", "Other"
    };

    public async Task<MerchantVerificationDto> GetMyVerificationAsync(long storeId)
    {
        var verification = await GetOrCreateAsync(storeId);

        return await ToDtoAsync(verification.Id, storeId);
    }

    public async Task<MerchantVerificationDto> SubmitDocumentsAsync(long storeId, long userId, Stream fileStream, string fileName, string documentType)
    {
        if (!await StoreExistsAsync(storeId))
            throw new InvalidOperationException("المتجر غير موجود");

        if (fileStream == null || fileStream.Length == 0)
            throw new InvalidOperationException("الملف مطلوب");

        if (fileStream.Length > 10 * 1024 * 1024)
            throw new InvalidOperationException("حجم الملف يتجاوز 10 ميجابايت");

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        var allowedExt = new[] { ".jpg", ".jpeg", ".png", ".webp", ".pdf" };
        if (!allowedExt.Contains(ext))
            throw new InvalidOperationException("صيغة الملف غير مدعومة. استخدم JPG, PNG, WebP أو PDF");

        if (!AllowedTypes.Contains(documentType))
            throw new InvalidOperationException("نوع المستند غير صالح");

        var verification = await GetOrCreateAsync(storeId);
        if (verification.Status == MerchantVerificationStatus.Pending)
            throw new InvalidOperationException("لا يمكن تعديل المستندات بينما التوثيق قيد المراجعة");

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "verifications");
        Directory.CreateDirectory(uploadsDir);

        var uploadFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, uploadFileName);

        // تحقق من التوقيع الحقيقي للملف (Magic Bytes) قبل الحفظ
        using var memoryStream = new MemoryStream();
        await fileStream.CopyToAsync(memoryStream);
        memoryStream.Position = 0;

        var header = new byte[12];
        var headerRead = memoryStream.Read(header, 0, header.Length);
        var headerBytes = headerRead < header.Length 
            ? header.Take(headerRead).ToArray() 
            : header;

        if (!FileSignatureValidator.MatchesExtension(headerBytes, ext))
            throw new InvalidOperationException("الملف لا يطابق الصيغة المعلنة. تأكد أن الملف صورة حقيقية (JPG/PNG/WebP) أو ملف PDF");

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            memoryStream.Position = 0;
            await memoryStream.CopyToAsync(stream);
        }

        var relative = $"/uploads/verifications/{uploadFileName}";

        _context.MerchantDocument.Add(new MerchantDocument
        {
            VerificationId = verification.Id,
            DocumentType = documentType,
            FileName = fileName,
            FilePath = relative,
            Status = DocumentStatus.Pending,
        });

        if (verification.Status == MerchantVerificationStatus.Rejected)
        {
            verification.Status = MerchantVerificationStatus.NotSubmitted;
            verification.RejectionReason = null;
        }

        verification.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await ToDtoAsync(verification.Id, storeId);
    }

    public async Task<MerchantVerificationDto> RemoveDocumentAsync(long storeId, long documentId)
    {
        var verification = await GetOrCreateAsync(storeId);
        if (verification.Status == MerchantVerificationStatus.Pending)
            throw new InvalidOperationException("لا يمكن تعديل المستندات بينما التوثيق قيد المراجعة");

        var doc = await _context.MerchantDocument
            .FirstOrDefaultAsync(d => d.Id == documentId && d.VerificationId == verification.Id);
        if (doc == null)
            throw new InvalidOperationException("المستند غير موجود");

        _context.MerchantDocument.Remove(doc);
        verification.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await ToDtoAsync(verification.Id, storeId);
    }

    public async Task<MerchantVerificationDto> SubmitForReviewAsync(long storeId)
    {
        var verification = await GetOrCreateAsync(storeId);
        if (verification.Status == MerchantVerificationStatus.Pending)
            throw new InvalidOperationException("التوثيق قيد المراجعة بالفعل");
        if (verification.Status == MerchantVerificationStatus.Approved)
            throw new InvalidOperationException("تم اعتماد التوثيق مسبقًا");

        var docTypes = await _context.MerchantDocument
            .Where(d => d.VerificationId == verification.Id)
            .Select(d => d.DocumentType)
            .ToListAsync();

        var docSet = new HashSet<string>(docTypes);
        var hasCommercialRegister = docSet.Contains("CommercialRegister");
        var hasLicense = docSet.Contains("License");
        var hasIdCard = docSet.Contains("IdCard");

        if (!hasCommercialRegister && !hasLicense)
            throw new InvalidOperationException("أضف مستند السجل التجاري (CommercialRegister) أو الترخيص (License) قبل إرسال التوثيق للمراجعة");

        if (!hasIdCard)
            throw new InvalidOperationException("أضف مستند إثبات الهوية (IdCard) قبل إرسال التوثيق للمراجعة");

        verification.Status = MerchantVerificationStatus.Pending;
        verification.SubmittedAt = DateTime.UtcNow;
        verification.RejectionReason = null;
        verification.ReviewedAt = null;
        verification.ReviewedByUserId = null;
        verification.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await ToDtoAsync(verification.Id, storeId);
    }

    public async Task<List<AdminVerificationDto>> GetAllVerificationsAsync(string? status = null)
    {
        var query = _context.MerchantVerifications
            .Include(v => v.Store)
            .ThenInclude(s => s.Owner)
            .Include(v => v.ReviewedBy)
            .OrderByDescending(v => v.CreatedAt);

        var list = await query.ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
        {
            list = list
                .Where(v => v.Status.ToString().Equals(status, StringComparison.OrdinalIgnoreCase))
                .ToList();
        }

        var result = new List<AdminVerificationDto>();
        foreach (var v in list)
        {
            var docs = await _context.MerchantDocument
                .Where(d => d.VerificationId == v.Id)
                .Include(d => d.ReviewedBy)
                .OrderByDescending(d => d.CreatedAt)
                .ToListAsync();

            result.Add(MapAdmin(v, docs));
        }

        return result;
    }

    public async Task<AdminVerificationDto?> GetAdminVerificationAsync(long id)
    {
        var v = await _context.MerchantVerifications
            .Include(v => v.Store)
            .ThenInclude(s => s.Owner)
            .Include(v => v.ReviewedBy)
            .FirstOrDefaultAsync(v => v.Id == id);
        if (v == null) return null;

        var docs = await _context.MerchantDocument
            .Where(d => d.VerificationId == v.Id)
            .Include(d => d.ReviewedBy)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return MapAdmin(v, docs);
    }

    public async Task ProcessVerificationAsync(long id, ReviewVerificationDto dto, long adminUserId)
    {
        var verification = await _context.MerchantVerifications.FindAsync(id);
        if (verification == null)
            throw new InvalidOperationException("طلب التوثيق غير موجود");
        if (verification.Status != MerchantVerificationStatus.Pending)
            throw new InvalidOperationException("هذا الطلب لم يعد قيد المراجعة");

        verification.Status = dto.Approve ? MerchantVerificationStatus.Approved : MerchantVerificationStatus.Rejected;
        verification.RejectionReason = dto.Approve ? null : dto.RejectionReason;
        verification.ReviewedAt = DateTime.UtcNow;
        verification.ReviewedByUserId = adminUserId;
        verification.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task ReviewDocumentAsync(long verificationId, long documentId, ReviewDocumentDto dto, long adminUserId)
    {
        var verification = await _context.MerchantVerifications
            .Include(v => v.Store)
            .ThenInclude(s => s.Owner)
            .FirstOrDefaultAsync(v => v.Id == verificationId);
        if (verification == null)
            throw new InvalidOperationException("طلب التوثيق غير موجود");

        var doc = await _context.MerchantDocument
            .FirstOrDefaultAsync(d => d.Id == documentId && d.VerificationId == verificationId);
        if (doc == null)
            throw new InvalidOperationException("المستند غير موجود");

        doc.Status = dto.Approve ? DocumentStatus.Approved : DocumentStatus.Rejected;
        doc.RejectReason = dto.Approve ? null : dto.RejectReason;
        doc.ReviewedByUserId = adminUserId;
        doc.ReviewedAt = DateTime.UtcNow;
        doc.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var adminName = await _context.Users
            .Where(u => u.Id == adminUserId)
            .Select(u => u.FullName ?? u.Email)
            .FirstOrDefaultAsync() ?? "admin";

        var action = dto.Approve ? "merchant_document_approved" : "merchant_document_rejected";
        var titleAr = dto.Approve ? "تم اعتماد المستند" : "تم رفض المستند";
        var docLabel = DocumentTypeLabel(doc.DocumentType);
        var messageAr = dto.Approve
            ? $"تم اعتماد مستند «{docLabel}» في طلب التوثيق الخاص بالمتجر"
            : $"تم رفض مستند «{docLabel}»" + (string.IsNullOrWhiteSpace(dto.RejectReason) ? "" : $" بسبب: {dto.RejectReason}");

        _context.Set<FatooraRahatak.Domain.Entities.Audit.AuditLog>().Add(new FatooraRahatak.Domain.Entities.Audit.AuditLog
        {
            AdminUserId = adminUserId,
            AdminName = adminName,
            Action = action,
            TargetType = nameof(MerchantDocument),
            TargetId = doc.Id.ToString(),
            Details = messageAr,
            IpAddress = null
        });

        if (verification.Store.OwnerUserId is long ownerId && ownerId > 0)
        {
            _context.Set<FatooraRahatak.Domain.Entities.Notifications.Notification>().Add(
                new FatooraRahatak.Domain.Entities.Notifications.Notification
                {
                    UserId = ownerId,
                    TitleAr = titleAr,
                    MessageAr = messageAr,
                    Type = FatooraRahatak.Domain.Enums.NotificationType.General,
                    Link = "/dashboard/merchant-verification"
                });
        }

        await _context.SaveChangesAsync();

        var ownerEmail = verification.Store.Owner?.Email;
        if (!string.IsNullOrWhiteSpace(ownerEmail) && _emailService.IsConfigured())
        {
            try
            {
                await _emailService.SendEmailAsync(ownerEmail, titleAr, messageAr);
            }
            catch
            {
                // فشل الإرسال لا يوقف عملية الاعتماد
            }
        }
    }

    private static string DocumentTypeLabel(string type) => type switch
    {
        "CommercialRegister" => "السجل التجاري",
        "IdCard" => "إثبات الهوية",
        "License" => "رخصة النشاط",
        "VatCertificate" => "البطاقة الضريبية",
        _ => "مستند آخر"
    };

    private async Task<MerchantVerification> GetOrCreateAsync(long storeId)
    {
        var verification = await _context.MerchantVerifications
            .FirstOrDefaultAsync(v => v.StoreId == storeId);
        if (verification != null) return verification;

        verification = new MerchantVerification { StoreId = storeId };
        _context.MerchantVerifications.Add(verification);
        await _context.SaveChangesAsync();
        return verification;
    }

    private async Task<MerchantVerificationDto> ToDtoAsync(long verificationId, long storeId)
    {
        var verification = await _context.MerchantVerifications.FindAsync(verificationId);
        var docs = await _context.MerchantDocument
            .Where(d => d.VerificationId == verificationId)
            .Include(d => d.ReviewedBy)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync();

        return new MerchantVerificationDto
        {
            Id = verification!.Id,
            StoreId = storeId,
            Status = verification.Status.ToString(),
            RejectionReason = verification.RejectionReason,
            SubmittedAt = verification.SubmittedAt,
            ReviewedAt = verification.ReviewedAt,
            Documents = docs.Select(d => new MerchantDocumentDto
            {
                Id = d.Id,
                DocumentType = d.DocumentType,
                FileName = d.FileName,
                FilePath = d.FilePath,
                // ⚠️ إصلاح: كان الرابط يحتوي على "/api/v1" بينما الـ frontend يضيف هذا
                // البادئة تلقائيًا عبر baseURL (تمامًا كباقي نداءات الـ API) → كان يتكوّن
                // مسار مكرر "/api/v1/api/v1/..." يفشل بخطأ 404 ويمنع عرض المستند.
                Url = $"/owner/verification/documents/{d.Id}/file",
                Status = d.Status.ToString(),
                RejectReason = d.RejectReason,
                ReviewedByUserId = d.ReviewedByUserId,
                ReviewedByName = d.ReviewedBy?.FullName,
                ReviewedAt = d.ReviewedAt,
                CreatedAt = d.CreatedAt,
            }).ToList(),
        };
    }

    private AdminVerificationDto MapAdmin(MerchantVerification v, List<MerchantDocument> docs)
    {
        return new AdminVerificationDto
        {
            Id = v.Id,
            StoreId = v.StoreId,
            StoreName = v.Store.StoreName,
            StoreSlug = v.Store.StoreSlug,
            OwnerName = v.Store.Owner?.FullName ?? "",
            OwnerEmail = v.Store.Owner?.Email ?? "",
            Status = v.Status.ToString(),
            RejectionReason = v.RejectionReason,
            SubmittedAt = v.SubmittedAt,
            ReviewedAt = v.ReviewedAt,
            ReviewedByName = v.ReviewedBy?.FullName,
            Documents = docs.Select(d => new MerchantDocumentDto
            {
                Id = d.Id,
                DocumentType = d.DocumentType,
                FileName = d.FileName,
                FilePath = d.FilePath,
                // ⚠️ نفس الإصلاح: إزالة بادئة "/api/v1" المكررة (راجع المابر أعلاه).
                Url = $"/owner/verification/documents/{d.Id}/file",
                Status = d.Status.ToString(),
                RejectReason = d.RejectReason,
                ReviewedByUserId = d.ReviewedByUserId,
                ReviewedByName = d.ReviewedBy?.FullName,
                ReviewedAt = d.ReviewedAt,
                CreatedAt = d.CreatedAt,
            }).ToList(),
        };
    }

    public async Task<MerchantDocumentFileDto?> GetDocumentFileAsync(long documentId)
    {
        var doc = await _context.MerchantDocument
            .Include(d => d.Verification)
            .FirstOrDefaultAsync(d => d.Id == documentId);
        if (doc == null) return null;

        var absolutePath = Path.Combine(
            Directory.GetCurrentDirectory(), "wwwroot",
            doc.FilePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));

        return new MerchantDocumentFileDto
        {
            Id = doc.Id,
            StoreId = doc.Verification.StoreId,
            FilePath = doc.FilePath,
            AbsolutePath = absolutePath,
            FileName = doc.FileName,
            ContentType = ContentTypeFor(doc.FilePath),
            FileExists = File.Exists(absolutePath)
        };
    }

    private static string ContentTypeFor(string filePath)
    {
        var ext = Path.GetExtension(filePath).ToLowerInvariant();
        return ext switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            _ => "application/octet-stream"
        };
    }
}