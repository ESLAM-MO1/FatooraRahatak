using FatooraRahatak.Application.DTOs.Settlement;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Settlement;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class MerchantVerificationService : IMerchantVerificationService
{
    private readonly AppDbContext _context;

    public MerchantVerificationService(AppDbContext context) { _context = context; }

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

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await fileStream.CopyToAsync(stream);
        }

        var relative = $"/uploads/verifications/{uploadFileName}";

        _context.MerchantDocument.Add(new MerchantDocument
        {
            VerificationId = verification.Id,
            DocumentType = documentType,
            FileName = fileName,
            FilePath = relative,
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

        var hasDocs = await _context.MerchantDocument.AnyAsync(d => d.VerificationId == verification.Id);
        if (!hasDocs)
            throw new InvalidOperationException("أضف مستندًا واحدًا على الأقل قبل إرسال التوثيق للمراجعة");

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
                Url = d.FilePath,
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
                Url = d.FilePath,
                CreatedAt = d.CreatedAt,
            }).ToList(),
        };
    }
}