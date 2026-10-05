using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform.Domains;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class DomainPurchaseService : IDomainPurchaseService
{
    private readonly AppDbContext _context;
    private readonly IDomainService _domainService;
    private readonly INotificationService _notificationService;
    private readonly IPermissionCheckService _permCheck;

    private static readonly Regex DomainRegex = new(
        @"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$",
        RegexOptions.Compiled);

    public DomainPurchaseService(
        AppDbContext context,
        IDomainService domainService,
        INotificationService notificationService,
        IPermissionCheckService permCheck)
    {
        _context = context;
        _domainService = domainService;
        _notificationService = notificationService;
        _permCheck = permCheck;
    }

    public async Task<DomainPurchaseRequestDto?> GetMyLatestAsync(long userId)
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(userId);
        if (!storeId.HasValue) return null;

        var r = await _context.DomainPurchaseRequests
            .AsNoTracking()
            .Include(x => x.Store)
            .Where(x => x.StoreId == storeId.Value)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        return r == null ? null : Map(r);
    }

    public async Task<DomainPurchaseRequestDto> CreateAsync(long userId, CreateDomainPurchaseRequestDto dto)
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(userId)
            ?? throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك");

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        if (!string.IsNullOrWhiteSpace(store.CustomDomain))
            throw new InvalidOperationException("متجرك مرتبط بنطاق بالفعل");

        var hasOpen = await _context.DomainPurchaseRequests
            .AnyAsync(r => r.StoreId == store.Id && r.Status == DomainPurchaseRequestStatus.Pending);
        if (hasOpen)
            throw new InvalidOperationException("لديك طلب نطاق قيد المراجعة بالفعل");

        var preferred = (dto.PreferredName ?? string.Empty).Trim();
        if (preferred.Length == 0)
            throw new InvalidOperationException("يجب إدخال اسم النطاق المطلوب");
        if (preferred.Length > 100)
            throw new InvalidOperationException("اسم النطاق المطلوب طويل جدًا");

        var notes = (dto.Notes ?? string.Empty).Trim();
        if (notes.Length > 500)
            throw new InvalidOperationException("الملاحظات طويلة جدًا (الحد الأقصى 500 حرف)");

        var request = new DomainPurchaseRequest
        {
            StoreId = store.Id,
            RequestedByUserId = userId,
            PreferredName = preferred,
            Notes = notes.Length == 0 ? null : notes,
            Status = DomainPurchaseRequestStatus.Pending
        };
        _context.DomainPurchaseRequests.Add(request);
        await _context.SaveChangesAsync();

        try
        {
            var adminIds = await _context.Set<User>()
                .Where(u => u.UserType == UserType.SuperAdmin && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();
            foreach (var adminId in adminIds)
            {
                await _notificationService.CreateAsync(
                    adminId,
                    "طلب نطاق جديد",
                    $"طلب متجر \"{store.StoreName}\" الحصول على نطاق: {preferred}",
                    NotificationType.DomainRequestSubmitted,
                    "/dashboard/domain-purchase-requests");
            }
        }
        catch { }

        request.Store = store;
        return Map(request);
    }

    public async Task<List<DomainPurchaseRequestDto>> GetAllAsync(string? status)
    {
        IQueryable<DomainPurchaseRequest> q = _context.DomainPurchaseRequests
            .AsNoTracking()
            .Include(r => r.Store);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<DomainPurchaseRequestStatus>(status, true, out var st))
        {
            q = q.Where(r => r.Status == st);
        }

        var list = await q.OrderBy(r => r.Status).ThenByDescending(r => r.CreatedAt).ToListAsync();
        return list.Select(Map).ToList();
    }

    public async Task<DomainPurchaseRequestDto> CompleteAsync(long id, long adminUserId, CompleteDomainPurchaseRequestDto dto)
    {
        var req = await _context.DomainPurchaseRequests.Include(r => r.Store).FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new InvalidOperationException("الطلب غير موجود");
        if (req.Status != DomainPurchaseRequestStatus.Pending)
            throw new InvalidOperationException("تمت معالجة هذا الطلب بالفعل");

        var store = req.Store ?? throw new InvalidOperationException("المتجر غير موجود");

        var domain = NormalizeDomain(dto.DomainName);
        if (string.IsNullOrWhiteSpace(domain))
            throw new InvalidOperationException("يجب إدخال اسم النطاق");
        if (!DomainRegex.IsMatch(domain))
            throw new InvalidOperationException("صيغة النطاق غير صحيحة");
        if (IsPlatformDomain(domain))
            throw new InvalidOperationException("لا يمكن استخدام نطاق تابع للمنصة");

        if (!string.IsNullOrWhiteSpace(store.CustomDomain))
            throw new InvalidOperationException("المتجر مرتبط بنطاق بالفعل");

        var note = (dto.AdminNote ?? string.Empty).Trim();
        if (note.Length > 500)
            throw new InvalidOperationException("الملاحظة طويلة جدًا (الحد الأقصى 500 حرف)");

        // نفس مسار الربط الحالي بالظبط: يحفظ الدومين بحالة Pending
        // وخدمة التفعيل التلقائي تكمل (DNS ثم Plesk ثم SSL)
        await _domainService.BindCustomDomainAsync(store.Id, domain);

        req.Status = DomainPurchaseRequestStatus.Completed;
        req.AssignedDomain = domain;
        req.AdminNote = note.Length == 0 ? null : note;
        req.HandledByUserId = adminUserId;
        req.HandledAt = DateTime.UtcNow;
        req.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.CreateAsync(
                store.OwnerUserId,
                "تم تجهيز نطاقك",
                $"جهّزنا لك النطاق {domain} وربطناه بمتجرك، وسيتم تفعيله تلقائيًا خلال دقائق.",
                NotificationType.General,
                "/dashboard/store-settings?tab=domain");
        }
        catch { }

        return Map(req);
    }

    public async Task<DomainPurchaseRequestDto> RejectAsync(long id, long adminUserId, RejectDomainPurchaseRequestDto dto)
    {
        var req = await _context.DomainPurchaseRequests.Include(r => r.Store).FirstOrDefaultAsync(r => r.Id == id)
            ?? throw new InvalidOperationException("الطلب غير موجود");
        if (req.Status != DomainPurchaseRequestStatus.Pending)
            throw new InvalidOperationException("تمت معالجة هذا الطلب بالفعل");

        var note = (dto.AdminNote ?? string.Empty).Trim();
        if (note.Length == 0)
            throw new InvalidOperationException("يجب كتابة سبب الرفض");
        if (note.Length > 500)
            throw new InvalidOperationException("السبب طويل جدًا (الحد الأقصى 500 حرف)");

        req.Status = DomainPurchaseRequestStatus.Rejected;
        req.AdminNote = note;
        req.HandledByUserId = adminUserId;
        req.HandledAt = DateTime.UtcNow;
        req.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        try
        {
            if (req.Store != null)
            {
                await _notificationService.CreateAsync(
                    req.Store.OwnerUserId,
                    "تعذر تنفيذ طلب النطاق",
                    $"السبب: {note}",
                    NotificationType.General,
                    "/dashboard/store-settings?tab=domain");
            }
        }
        catch { }

        return Map(req);
    }

    private static string NormalizeDomain(string? input)
    {
        var d = (input ?? string.Empty).Trim().ToLowerInvariant();
        if (d.StartsWith("https://")) d = d[8..];
        if (d.StartsWith("http://")) d = d[7..];
        return d.TrimEnd('/');
    }

    private static bool IsPlatformDomain(string d) =>
        d == "rahtk.sa" || d.EndsWith(".rahtk.sa") || d == "fatorahr.com" || d.EndsWith(".fatorahr.com");

    private static DomainPurchaseRequestDto Map(DomainPurchaseRequest r) => new()
    {
        Id = r.Id,
        StoreId = r.StoreId,
        StoreName = r.Store?.StoreName ?? string.Empty,
        PreferredName = r.PreferredName,
        Notes = r.Notes,
        Status = r.Status.ToString(),
        AssignedDomain = r.AssignedDomain,
        AdminNote = r.AdminNote,
        CreatedAt = r.CreatedAt,
        HandledAt = r.HandledAt
    };
}
