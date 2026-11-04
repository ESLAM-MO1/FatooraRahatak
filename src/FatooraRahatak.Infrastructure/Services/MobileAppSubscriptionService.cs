using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

// خدمة اشتراك "صناعة تطبيقات الجوال":
// تعيد استخدام منطق الاشتراك القائم (مبلغ مستحق + تفعيل عبر ويب هوك الدفع الإلكتروني).
public class MobileAppSubscriptionService : IMobileAppSubscriptionService
{
    private const string FreePackageName = "المجانية";

    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public MobileAppSubscriptionService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // مدة الفوترة بالأشهر، مطابقةً لمنطق اشتراك المنصة (شهري=1، سنوي=12).
    private static int GetBillingMonths(BillingCycle cycle) => (int)cycle;

    private static decimal GetBillingDiscount(BillingCycle cycle) => cycle switch
    {
        BillingCycle.Yearly => 0.10m,
        BillingCycle.TwoYears => 0.15m,
        _ => 0m
    };

    private static decimal GetTotalPrice(decimal monthlyPrice, BillingCycle cycle)
    {
        var months = GetBillingMonths(cycle);
        var discount = GetBillingDiscount(cycle);
        return monthlyPrice * months * (1 - discount);
    }

    private static bool IsFreePackage(Package package) =>
        package.MonthlyPrice <= 0m || package.PackageName == FreePackageName;

    public async Task<MobileAppSubscriptionDto> GetStatusAsync(long storeId)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var package = store.Package;

        // أحدث اشتراك أو طلب في خدمة التطبيقات لهذا المتجر.
        var latest = await _context.StoreAppSubscriptions
            .AsNoTracking()
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        var dto = new MobileAppSubscriptionDto
        {
            StoreId = storeId,
            PackageName = package?.PackageName ?? string.Empty,
            MonthlyPrice = package?.MobileAppMonthlyPrice ?? 0m,
            YearlyPrice = GetTotalPrice(package?.MobileAppMonthlyPrice ?? 0m, BillingCycle.Yearly),
            // متاحة في كل الباقات ما عدا المجانية، وبشرط أن تكون مفعّلة على الباقة.
            IsAvailable = package != null && package.HasMobileApp && !IsFreePackage(package)
        };

        if (latest != null)
        {
            var effectiveEnd = latest.EndDate;
            dto.Id = latest.Id;
            dto.Status = latest.Status.ToString();
            dto.PaymentStatus = latest.PaymentStatus;
            dto.BillingCycle = latest.BillingCycle.ToString();
            dto.DueAmount = latest.DueAmount;
            dto.AutoRenew = latest.AutoRenew;
            dto.AppName = latest.AppName;
            dto.DeveloperAccountType = latest.DeveloperAccountType;
            dto.DeveloperAccountInfo = latest.DeveloperAccountInfo;
            dto.MerchantNotes = latest.MerchantNotes;
            dto.AdminNote = latest.AdminNote;
            dto.StartDate = latest.StartDate;
            dto.EndDate = latest.EndDate;
            dto.CompletedAt = latest.CompletedAt;
            dto.CreatedAt = latest.CreatedAt;
            dto.DaysRemaining = latest.Status == SubscriptionStatus.Active
                ? Math.Max(0, (int)Math.Ceiling((effectiveEnd - DateTime.UtcNow).TotalDays))
                : null;
        }
        else
        {
            dto.Status = "None";
            dto.PaymentStatus = "None";
        }

        return dto;
    }

    public async Task<MobileAppSubscriptionDto> SubscribeAsync(long storeId, long userId, SubscribeMobileAppDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var package = store.Package
            ?? throw new InvalidOperationException("لا توجد باقة مرتبطة بالمتجر");

        if (IsFreePackage(package))
            throw new InvalidOperationException("خدمة صناعة تطبيقات الجوال غير متاحة في الباقة المجانية");

        if (!package.HasMobileApp)
            throw new InvalidOperationException("خدمة صناعة تطبيقات الجوال غير متاحة في باقتك الحالية");

        if (package.MobileAppMonthlyPrice <= 0m)
            throw new InvalidOperationException("لم يُحدَّد سعر اشتراك التطبيق بعد. يرجى التواصل مع الدعم");

        // منع فتح أكثر من اشتراك نشط أو قيد الدفع في الوقت نفسه.
        var hasActiveOrPending = await _context.StoreAppSubscriptions
            .AnyAsync(s => s.StoreId == storeId &&
                           (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Pending));
        if (hasActiveOrPending)
            throw new InvalidOperationException("لديك اشتراك قائم أو طلب قيد الدفع في خدمة تطبيقات الجوال");

        if (!Enum.TryParse<BillingCycle>(dto.BillingCycle, true, out var cycle))
            cycle = BillingCycle.Monthly;

        var accountType = string.IsNullOrWhiteSpace(dto.DeveloperAccountType)
            ? "Company"
            : dto.DeveloperAccountType.Trim();
        if (accountType != "Company" && accountType != "Platform")
            accountType = "Company";

        var total = GetTotalPrice(package.MobileAppMonthlyPrice, cycle);

        var subscription = new StoreAppSubscription
        {
            StoreId = storeId,
            PackageId = package.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(cycle)),
            BillingCycle = cycle,
            Status = SubscriptionStatus.Pending,
            PaymentStatus = "Pending",
            DueAmount = total,
            AutoRenew = true,
            AppName = Trim(dto.AppName, 200),
            DeveloperAccountType = accountType,
            DeveloperAccountInfo = Trim(dto.DeveloperAccountInfo, 1000),
            MerchantNotes = Trim(dto.MerchantNotes, 1000)
        };

        _context.StoreAppSubscriptions.Add(subscription);
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
                    "طلب اشتراك في صناعة تطبيقات الجوال",
                    $"تقدّم متجر \"{store.StoreName}\" بطلب اشتراك في صناعة تطبيقات الجوال بقيمة {total:0.##} ر.س.",
                    NotificationType.General,
                    "/dashboard/app-subscriptions");
            }
        }
        catch { }

        return await GetStatusAsync(storeId);
    }

    public async Task ActivateOnPaymentAsync(long appSubscriptionId)
    {
        var subscription = await _context.StoreAppSubscriptions
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == appSubscriptionId);
        if (subscription == null || subscription.Status == SubscriptionStatus.Active)
            return;

        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == subscription.StoreId);
        if (store == null)
            return;

        // إلغاء أي اشتراك نشط آخر في خدمة التطبيقات لنفس المتجر.
        var others = await _context.StoreAppSubscriptions
            .Where(s => s.StoreId == subscription.StoreId &&
                        s.Status == SubscriptionStatus.Active &&
                        s.Id != subscription.Id)
            .ToListAsync();
        foreach (var other in others)
        {
            other.Status = SubscriptionStatus.Cancelled;
            other.AutoRenew = false;
            other.UpdatedAt = DateTime.UtcNow;
        }

        subscription.Status = SubscriptionStatus.Active;
        subscription.StartDate = DateTime.UtcNow;
        subscription.EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(subscription.BillingCycle));
        subscription.PaymentStatus = "Paid";
        subscription.AutoRenew = true;
        subscription.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.CreateAsync(
                store.OwnerUserId,
                "تم تفعيل اشتراك تطبيق الجوال",
                $"تم تفعيل اشتراك \"صناعة تطبيقات الجوال\" لمتجرك. سيبدأ فريقنا بإجراءات الإطلاق، وسيُصبح تطبيقك جاهزًا خلال 72 ساعة.",
                NotificationType.General,
                "/dashboard/store-settings?tab=mobileApp");
        }
        catch { }
    }

    public async Task CancelAsync(long storeId)
    {
        var active = await _context.StoreAppSubscriptions
            .Where(s => s.StoreId == storeId &&
                        (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Pending))
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();
        if (active == null)
            throw new InvalidOperationException("لا يوجد اشتراك قائم في خدمة تطبيقات الجوال");

        active.Status = SubscriptionStatus.Cancelled;
        active.AutoRenew = false;
        active.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<AdminMobileAppSubscriptionDto>> GetAllAsync(string? status)
    {
        IQueryable<StoreAppSubscription> q = _context.StoreAppSubscriptions
            .AsNoTracking()
            .Include(s => s.Store)
            .Include(s => s.Package);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<SubscriptionStatus>(status, true, out var st))
        {
            q = q.Where(s => s.Status == st);
        }

        var list = await q
            .OrderBy(s => s.Status)
            .ThenByDescending(s => s.CreatedAt)
            .ToListAsync();

        return list.Select(Map).ToList();
    }

    public async Task<AdminMobileAppSubscriptionDto> CompleteAsync(long id, long adminUserId, UpdateMobileAppSubscriptionDto dto)
    {
        var sub = await _context.StoreAppSubscriptions
            .Include(s => s.Store).Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new InvalidOperationException("الطلب غير موجود");

        if (sub.Status == SubscriptionStatus.Cancelled)
            throw new InvalidOperationException("لا يمكن تعديل طلب ملغى");

        var note = Trim(dto.AdminNote, 1000);
        sub.Status = SubscriptionStatus.Active;
        sub.PaymentStatus = "Paid";
        sub.AdminNote = note;
        sub.HandledByUserId = adminUserId;
        sub.CompletedAt = DateTime.UtcNow;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        try
        {
            if (sub.Store != null)
            {
                await _notificationService.CreateAsync(
                    sub.Store.OwnerUserId,
                    "تم اعتماد طلب تطبيق الجوال",
                    "تم اعتماد طلبك في خدمة صناعة تطبيقات الجوال وبدأنا إجراءات الإطلاق.",
                    NotificationType.General,
                    "/dashboard/store-settings?tab=mobileApp");
            }
        }
        catch { }

        return Map(sub);
    }

    public async Task<AdminMobileAppSubscriptionDto> RejectAsync(long id, long adminUserId, UpdateMobileAppSubscriptionDto dto)
    {
        var sub = await _context.StoreAppSubscriptions
            .Include(s => s.Store).Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new InvalidOperationException("الطلب غير موجود");

        if (sub.Status == SubscriptionStatus.Active && sub.PaymentStatus == "Paid")
            throw new InvalidOperationException("لا يمكن رفض اشتراك مدفوع ومفعّل");

        var note = Trim(dto.AdminNote, 1000);
        if (string.IsNullOrEmpty(note))
            throw new InvalidOperationException("يرجى كتابة سبب الرفض");

        sub.Status = SubscriptionStatus.Cancelled;
        sub.AdminNote = note;
        sub.HandledByUserId = adminUserId;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        try
        {
            if (sub.Store != null)
            {
                await _notificationService.CreateAsync(
                    sub.Store.OwnerUserId,
                    "تم رفض طلب تطبيق الجوال",
                    $"تم رفض طلب اشتراك تطبيق الجوال. السبب: {note}",
                    NotificationType.General,
                    "/dashboard/store-settings?tab=mobileApp");
            }
        }
        catch { }

        return Map(sub);
    }

    private static string? Trim(string? value, int max)
    {
        var v = (value ?? string.Empty).Trim();
        if (v.Length == 0) return null;
        return v.Length > max ? v[..max] : v;
    }

    private static AdminMobileAppSubscriptionDto Map(StoreAppSubscription s) => new()
    {
        Id = s.Id,
        StoreId = s.StoreId,
        StoreName = s.Store?.StoreName ?? string.Empty,
        StoreSlug = s.Store?.StoreSlug ?? string.Empty,
        PackageName = s.Package?.PackageName ?? string.Empty,
        Status = s.Status.ToString(),
        PaymentStatus = s.PaymentStatus,
        BillingCycle = s.BillingCycle.ToString(),
        DueAmount = s.DueAmount,
        AppName = s.AppName,
        DeveloperAccountType = s.DeveloperAccountType,
        DeveloperAccountInfo = s.DeveloperAccountInfo,
        MerchantNotes = s.MerchantNotes,
        AdminNote = s.AdminNote,
        StartDate = s.StartDate,
        EndDate = s.EndDate,
        CompletedAt = s.CompletedAt,
        CreatedAt = s.CreatedAt
    };
}
