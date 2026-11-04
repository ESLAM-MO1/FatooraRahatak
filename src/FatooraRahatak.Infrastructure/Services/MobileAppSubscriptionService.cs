using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

// خدمة "صانع تطبيقات الجوال":
// تعيد استخدام منطق الاشتراك القائم (مبلغ مستحق + تفعيل عبر ويب هوك الدفع الإلكتروني)،
// وتضيف مراحل صانع تطبيقات سلة الثلاث: صمّم (SaveDesign) → اشترك (Subscribe)
// → أطلق (SubmitForPublish → مراجعة الفريق → Publish)، مع الإشعارات والإحصاءات.
public class MobileAppSubscriptionService : IMobileAppSubscriptionService
{
    private const string FreePackageName = "المجانية";

    private static readonly string[] AutomatedKeys =
    {
        "OrderTracking", "AbandonedCart", "BackInStock", "OrderShipped", "WelcomeMessage", "OrderDelivered"
    };

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

            // ── عناصر صانع التطبيقات ──
            dto.PublishStatus = latest.PublishStatus;
            dto.AdminReviewNote = latest.AdminReviewNote;
            dto.DesignJson = latest.DesignJson;
            dto.ListingShortDescription = latest.ListingShortDescription;
            dto.ListingDescription = latest.ListingDescription;
            dto.ListingKeywords = latest.ListingKeywords;
            dto.ListingCategory = latest.ListingCategory;
            dto.ListingIconUrl = latest.ListingIconUrl;
            dto.ListingScreenshots = ParseScreenshots(latest.ListingScreenshotsJson);
            dto.ListingSupportEmail = latest.ListingSupportEmail;
            dto.ListingPrivacyUrl = latest.ListingPrivacyUrl;
            dto.SubmittedAt = latest.SubmittedAt;
            dto.PublishedAt = latest.PublishedAt;
            dto.AppStoreUrl = latest.AppStoreUrl;
            dto.GooglePlayUrl = latest.GooglePlayUrl;
            dto.CurrentAppVersion = latest.CurrentAppVersion;
            dto.DownloadCount = latest.DownloadCount;
            dto.SalesCount = latest.SalesCount;
            dto.CurrentStep = ResolveStep(latest);
        }
        else
        {
            dto.Status = "None";
            dto.PaymentStatus = "None";
            dto.CurrentStep = "design";
        }

        return dto;
    }

    // ── حزمة بيانات المتجر الفعلية ──
    // تُغذّي المصمّم والمعاينة بمنتجات المتجر وأقسامه وهويته الحقيقية.
    public async Task<MobileAppBundleDto> GetBundleAsync(long storeId)
    {
        var store = await _context.Stores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var bundle = new MobileAppBundleDto
        {
            Store = new StoreBrandingDto
            {
                StoreId = store.Id,
                StoreName = store.StoreName,
                StoreSlug = store.StoreSlug,
                Logo = store.Logo,
                CoverImage = store.CoverImage,
                Currency = string.IsNullOrWhiteSpace(store.Currency) ? "SAR" : store.Currency,
                ThemeName = store.ThemeName,
                ColorsJson = store.ColorsJson,
                Bio = store.BioLink
            },
            Contact = new AppContactDto
            {
                Phone = store.ContactPhone,
                Email = store.ContactEmail,
                Whatsapp = store.WhatsappUrl,
                Address = store.ContactAddress,
                Instagram = store.InstagramUrl,
                Twitter = store.TwitterUrl,
                Facebook = store.FacebookUrl
            }
        };

        // ── الأقسام الحقيقية ──
        var categories = await _context.Categories
            .AsNoTracking()
            .Where(c => c.StoreId == storeId && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new { c.Id, c.NameAr, c.Image })
            .ToListAsync();

        var productCounts = await _context.Products
            .AsNoTracking()
            .Where(p => p.StoreId == storeId && p.Status == ProductStatus.Active)
            .GroupBy(p => p.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync();

        bundle.Categories = categories.Select(c => new AppCategoryDto
        {
            Id = c.Id,
            Name = c.NameAr,
            Image = c.Image,
            ProductCount = productCounts.FirstOrDefault(x => x.CategoryId == c.Id)?.Count ?? 0
        }).ToList();

        // ── المنتجات الحقيقية (المنشور فقط) ──
        var products = await _context.Products
            .AsNoTracking()
            .Include(p => p.Images)
            .Where(p => p.StoreId == storeId && p.Status == ProductStatus.Active)
            .OrderByDescending(p => p.CreatedAt)
            .Take(120)
            .ToListAsync();

        var catNames = categories.ToDictionary(c => c.Id, c => c.NameAr);
        var mapped = products.Select(p => MapProduct(p, catNames)).ToList();

        bundle.Products = mapped;
        bundle.NewArrivals = mapped.Take(8).ToList();
        bundle.FeaturedProducts = mapped
            .Where(p => p.DiscountPrice.HasValue)
            .Take(8)
            .ToList();
        if (bundle.FeaturedProducts.Count == 0) bundle.FeaturedProducts = mapped.Take(8).ToList();

        bundle.Offers = mapped
            .Where(p => p.DiscountPrice.HasValue && p.DiscountPrice.Value < p.Price)
            .Take(8)
            .ToList();

        // ── بانر رئيسي من معلومات المتجر (تغطية/شعار) ──
        if (!string.IsNullOrWhiteSpace(store.CoverImage) || !string.IsNullOrWhiteSpace(store.StoreName))
        {
            bundle.Banners.Add(new AppBannerDto
            {
                Title = store.StoreName,
                Subtitle = store.BioLink,
                ImageUrl = store.CoverImage
            });
        }

        return bundle;
    }

    private static AppProductDto MapProduct(Domain.Entities.Products.Product p, Dictionary<long, string> catNames)
    {
        var image = p.Images
            .OrderByDescending(i => i.IsPrimary)
            .ThenBy(i => i.SortOrder)
            .Select(i => i.ImageUrl)
            .FirstOrDefault();

        decimal? discountPercent = null;
        if (p.DiscountPrice.HasValue && p.BasePrice > 0 && p.DiscountPrice.Value < p.BasePrice)
            discountPercent = Math.Round((1 - (p.DiscountPrice.Value / p.BasePrice)) * 100, 0);

        return new AppProductDto
        {
            Id = p.Id,
            Name = p.NameAr,
            Price = p.BasePrice,
            DiscountPrice = p.DiscountPrice,
            DiscountPercent = discountPercent,
            ImageUrl = image,
            CategoryId = p.CategoryId,
            CategoryName = p.CategoryId.HasValue ? catNames.GetValueOrDefault(p.CategoryId.Value) : null,
            InStock = true,
            ShortDescription = p.DescriptionAr,
            CreatedAt = p.CreatedAt
        };
    }

    // الخطوة الحالية في المسار: صمّم → اشترك → أطلق.
    private static string ResolveStep(StoreAppSubscription s)
    {
        if (s.Status == SubscriptionStatus.Pending) return "subscribe";
        if (s.PublishStatus == "Published") return "launched";
        if (s.Status == SubscriptionStatus.Active) return "launch";
        return "design";
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
            MerchantNotes = Trim(dto.MerchantNotes, 1000),
            PublishStatus = "Draft"
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
                "تم تفعيل اشتراك \"صناعة تطبيقات الجوال\" لمتجرك. يمكنك الآن إكمال تصميم تطبيقك ثم الضغط على \"نشر التطبيق\".",
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

    // ── صمّم: حفظ تصميم التطبيق ──
    public async Task<MobileAppSubscriptionDto> SaveDesignAsync(long storeId, long userId, SaveMobileAppDesignDto dto)
    {
        var sub = await GetActiveSubscriptionForStoreAsync(storeId);

        if (dto.DesignJson != null)
        {
            var json = dto.DesignJson.Trim();
            if (json.Length > 0)
            {
                // التحقق من صحة صيغة JSON قبل الحفظ.
                try { using var _ = JsonDocument.Parse(json); }
                catch { throw new InvalidOperationException("صيغة تصميم التطبيق غير صحيحة"); }
                sub.DesignJson = json;
            }
        }

        var name = Trim(dto.AppName, 200);
        if (name != null) sub.AppName = name;

        // أي تعديل بعد النشر يُعلَم كتحديث قيد المزامنة (يطابق سلوك سلة: التعديل يصل للعملاء).
        if (sub.PublishStatus == "Published")
            sub.UpdatedAt = DateTime.UtcNow;

        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return await GetStatusAsync(storeId);
    }

    // ── أطلق: إرسال التطبيق للإطلاق ──
    public async Task<MobileAppSubscriptionDto> SubmitForPublishAsync(long storeId, long userId, SubmitMobileAppPublishDto dto)
    {
        var sub = await GetActiveSubscriptionForStoreAsync(storeId);

        if (sub.Status != SubscriptionStatus.Active)
            throw new InvalidOperationException("يجب إتمام الاشتراك أولًا قبل إطلاق التطبيق");

        if (sub.PublishStatus == "Submitted" || sub.PublishStatus == "InReview")
            throw new InvalidOperationException("طلب النشر قيد مراجعة فريق المنصة بالفعل");

        var name = Trim(dto.AppName, 200) ?? sub.AppName;
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("يرجى إدخال اسم التطبيق قبل النشر");

        var shortDesc = Trim(dto.ListingShortDescription, 1000);
        if (string.IsNullOrWhiteSpace(shortDesc))
            throw new InvalidOperationException("يرجى إدخال وصف مختصر للتطبيق");
        if (string.IsNullOrWhiteSpace(dto.ListingDescription))
            throw new InvalidOperationException("يرجى إدخال وصف التطبيق");
        if (string.IsNullOrWhiteSpace(dto.ListingIconUrl))
            throw new InvalidOperationException("يرجى رفع أيقونة التطبيق");

        sub.AppName = name;
        sub.ListingShortDescription = shortDesc;
        sub.ListingDescription = Trim(dto.ListingDescription, 4000);
        sub.ListingKeywords = Trim(dto.ListingKeywords, 200);
        sub.ListingCategory = Trim(dto.ListingCategory, 100);
        sub.ListingIconUrl = Trim(dto.ListingIconUrl, 500);
        sub.ListingScreenshotsJson = SerializeScreenshots(dto.ListingScreenshots);
        sub.ListingSupportEmail = Trim(dto.ListingSupportEmail, 500);
        sub.ListingPrivacyUrl = Trim(dto.ListingPrivacyUrl, 500);
        sub.PublishStatus = "Submitted";
        sub.SubmittedAt = DateTime.UtcNow;
        sub.AdminReviewNote = null;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        try
        {
            var adminIds = await _context.Set<User>()
                .Where(u => u.UserType == UserType.SuperAdmin && u.IsActive)
                .Select(u => u.Id).ToListAsync();
            foreach (var adminId in adminIds)
            {
                await _notificationService.CreateAsync(
                    adminId,
                    "طلب نشر تطبيق جديد",
                    $"أرسل متجر \"{store?.StoreName}\" تطبيقه \"{name}\" للنشر، وهو بانتظار المراجعة.",
                    NotificationType.General,
                    "/dashboard/app-subscriptions");
            }
        }
        catch { }

        return await GetStatusAsync(storeId);
    }

    // ── الإشعارات ──
    public async Task<List<AppNotificationDto>> GetNotificationsAsync(long storeId)
    {
        var list = await _context.StoreAppNotifications
            .AsNoTracking()
            .Where(n => n.StoreId == storeId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync();
        return list.Select(MapNotification).ToList();
    }

    public async Task<AppNotificationDto> SendNotificationAsync(long storeId, long userId, SendAppNotificationDto dto)
    {
        // التأكد من وجود اشتراك نشط.
        await GetActiveSubscriptionForStoreAsync(storeId);

        if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Body))
            throw new InvalidOperationException("يرجى إدخال عنوان الإشعار ونصّه");

        var kind = string.Equals(dto.Kind, "Scheduled", StringComparison.OrdinalIgnoreCase) ? "Scheduled" : "Instant";
        if (kind == "Scheduled" && (dto.ScheduledAt == null || dto.ScheduledAt <= DateTime.UtcNow))
            throw new InvalidOperationException("يرجى تحديد موعد مستقبلي صحيح للإشعار المجدول");

        var notification = new StoreAppNotification
        {
            StoreId = storeId,
            CreatedByUserId = userId,
            Title = Trim(dto.Title, 200) ?? string.Empty,
            Body = Trim(dto.Body, 2000) ?? string.Empty,
            ImageUrl = Trim(dto.ImageUrl, 1000),
            Kind = kind,
            ScheduledAt = kind == "Scheduled" ? dto.ScheduledAt : null,
            SentAt = kind == "Instant" ? DateTime.UtcNow : null,
            Status = kind == "Instant" ? "Sent" : "Scheduled"
        };

        _context.StoreAppNotifications.Add(notification);
        await _context.SaveChangesAsync();
        return MapNotification(notification);
    }

    public async Task CancelNotificationAsync(long storeId, long notificationId)
    {
        var n = await _context.StoreAppNotifications
            .FirstOrDefaultAsync(x => x.Id == notificationId && x.StoreId == storeId)
            ?? throw new InvalidOperationException("الإشعار غير موجود");
        if (n.Status != "Scheduled")
            throw new InvalidOperationException("لا يمكن إلغاء إشعار أُرسل بالفعل");
        n.Status = "Cancelled";
        n.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<AutomatedAppNotificationDto>> GetAutomatedNotificationsAsync(long storeId)
    {
        // القوالب الافتراضية، مدموجة مع ما خزّنه التاجر في DesignJson (تحت المفتاح
        // automatedNotifications). أي قالب خزّنه التاجر يستبدل الافتراضي بنفس المفتاح.
        var defaults = DefaultAutomated();
        try
        {
            var sub = await _context.StoreAppSubscriptions
                .AsNoTracking()
                .Where(s => s.StoreId == storeId)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();
            if (sub == null) return defaults;

            var stored = ReadAutomatedFromDesign(sub.DesignJson);
            if (stored.Count == 0) return defaults;

            foreach (var item in defaults)
            {
                if (stored.TryGetValue(item.Key, out var custom))
                {
                    if (!string.IsNullOrWhiteSpace(custom.Title)) item.Title = custom.Title!;
                    if (!string.IsNullOrWhiteSpace(custom.Body)) item.Body = custom.Body!;
                    item.Enabled = custom.Enabled;
                }
            }
        }
        catch { /* عند أي خطأ نُعيد الافتراضي */ }
        return defaults;
    }

    public async Task SetAutomatedNotificationAsync(long storeId, AutomatedAppNotificationDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Key) || !AutomatedKeys.Contains(dto.Key))
            throw new InvalidOperationException("نوع الإشعار المؤتمت غير معروف");

        var sub = await GetActiveSubscriptionForStoreAsync(storeId);
        var map = ReadAutomatedFromDesign(sub.DesignJson);
        map[dto.Key] = new AutomatedAppNotificationDto
        {
            Key = dto.Key,
            Title = Trim(dto.Title, 200) ?? string.Empty,
            Body = Trim(dto.Body, 2000) ?? string.Empty,
            Enabled = dto.Enabled
        };
        sub.DesignJson = MergeAutomatedIntoDesign(sub.DesignJson, map);
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private static List<AutomatedAppNotificationDto> DefaultAutomated() => new()
    {
        new() { Key = "OrderTracking", Title = "تتبّع طلبك", Body = "طلبك رقم {order} في طريقه إليك.", Enabled = true },
        new() { Key = "OrderShipped", Title = "تم شحن طلبك", Body = "تم شحن طلبك رقم {order} وهو في الطريق.", Enabled = true },
        new() { Key = "OrderDelivered", Title = "تم تسليم طلبك", Body = "تم تسليم طلبك رقم {order}. شكرًا لك.", Enabled = true },
        new() { Key = "AbandonedCart", Title = "أكمل طلبك", Body = "لا تزال منتجات في سلتك بانتظارك.", Enabled = false },
        new() { Key = "BackInStock", Title = "عاد إلى المخزون", Body = "المنتج الذي ترغب به متوفّر الآن.", Enabled = false },
        new() { Key = "WelcomeMessage", Title = "مرحبًا بك", Body = "شكرًا لتحميلك تطبيقنا.", Enabled = true }
    };

    private static Dictionary<string, AutomatedAppNotificationDto> ReadAutomatedFromDesign(string? designJson)
    {
        var result = new Dictionary<string, AutomatedAppNotificationDto>();
        if (string.IsNullOrWhiteSpace(designJson)) return result;
        try
        {
            using var doc = JsonDocument.Parse(designJson!);
            if (doc.RootElement.TryGetProperty("automatedNotifications", out var arr) &&
                arr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in arr.EnumerateArray())
                {
                    var key = item.TryGetProperty("key", out var k) ? k.GetString() : null;
                    if (string.IsNullOrWhiteSpace(key)) continue;
                    result[key!] = new AutomatedAppNotificationDto
                    {
                        Key = key!,
                        Title = item.TryGetProperty("title", out var t) ? (t.GetString() ?? "") : "",
                        Body = item.TryGetProperty("body", out var b) ? (b.GetString() ?? "") : "",
                        Enabled = item.TryGetProperty("enabled", out var e) && e.ValueKind == JsonValueKind.True
                    };
                }
            }
        }
        catch { }
        return result;
    }

    private static string MergeAutomatedIntoDesign(string? designJson, Dictionary<string, AutomatedAppNotificationDto> map)
    {
        var baseObj = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(designJson))
        {
            try
            {
                var parsed = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(designJson!);
                if (parsed != null)
                    foreach (var kv in parsed)
                        baseObj[kv.Key] = kv.Value;
            }
            catch { }
        }
        baseObj["automatedNotifications"] = map.Values.ToList();
        return JsonSerializer.Serialize(baseObj);
    }

    // ── الإحصاءات ──
    public async Task<AppAnalyticsDto> GetAnalyticsAsync(long storeId, int days)
    {
        if (days <= 0) days = 30;
        if (days > 365) days = 365;

        var since = DateTime.UtcNow.Date.AddDays(-(days - 1));

        var rows = await _context.StoreAppStats
            .AsNoTracking()
            .Where(s => s.StoreId == storeId && s.StatDate >= since)
            .OrderBy(s => s.StatDate)
            .ToListAsync();

        var sub = await _context.StoreAppSubscriptions
            .AsNoTracking()
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        return new AppAnalyticsDto
        {
            TotalInstalls = rows.Sum(r => r.Installs),
            TotalSessions = rows.Sum(r => r.Sessions),
            TotalOrders = rows.Sum(r => r.Orders),
            TotalRevenue = rows.Sum(r => r.Revenue),
            TotalNewCustomers = rows.Sum(r => r.NewCustomers),
            DownloadCount = sub?.DownloadCount ?? rows.Sum(r => r.Installs),
            SalesCount = sub?.SalesCount ?? rows.Sum(r => r.Orders),
            Daily = rows.Select(r => new AppAnalyticsPointDto
            {
                Date = r.StatDate,
                Installs = r.Installs,
                Sessions = r.Sessions,
                Orders = r.Orders,
                Revenue = r.Revenue,
                NewCustomers = r.NewCustomers
            }).ToList()
        };
    }

    public async Task<List<AdminMobileAppSubscriptionDto>> GetAllAsync(string? status)
    {
        IQueryable<StoreAppSubscription> q = _context.StoreAppSubscriptions
            .AsNoTracking()
            .Include(s => s.Store)
            .Include(s => s.Builds)
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
                    "تم اعتماد طلبك في صناعة تطبيقات الجوال. يمكنك الآن إكمال التصميم ثم الضغط على \"نشر التطبيق\".",
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

    // ── مراجعة طلبات النشر من فريق المنصة ──
    public async Task<List<AdminMobileAppSubscriptionDto>> GetPendingPublishAsync()
    {
        var list = await _context.StoreAppSubscriptions
            .AsNoTracking()
            .Include(s => s.Store).Include(s => s.Builds).Include(s => s.Package)
            .Where(s => s.PublishStatus == "Submitted" || s.PublishStatus == "InReview")
            .OrderBy(s => s.SubmittedAt)
            .ToListAsync();
        return list.Select(Map).ToList();
    }

    public async Task<AdminMobileAppSubscriptionDto> StartReviewAsync(long id, long adminUserId)
    {
        var sub = await GetSubscriptionForReviewAsync(id);
        if (sub.PublishStatus != "Submitted")
            throw new InvalidOperationException("لا يمكن بدء المراجعة في الحالة الحالية");
        sub.PublishStatus = "InReview";
        sub.HandledByUserId = adminUserId;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return Map(sub);
    }

    public async Task<AdminMobileAppSubscriptionDto> PublishAsync(long id, long adminUserId, ReviewMobileAppPublishDto dto)
    {
        var sub = await GetSubscriptionForReviewAsync(id);
        if (sub.PublishStatus != "Submitted" && sub.PublishStatus != "InReview")
            throw new InvalidOperationException("لا يمكن نشر التطبيق في الحالة الحالية");

        var appStoreUrl = Trim(dto.AppStoreUrl, 500);
        var playUrl = Trim(dto.GooglePlayUrl, 500);
        if (string.IsNullOrWhiteSpace(appStoreUrl) && string.IsNullOrWhiteSpace(playUrl))
            throw new InvalidOperationException("يرجى إدخال رابط واحد على الأقل (App Store أو Google Play)");

        sub.PublishStatus = "Published";
        sub.PublishedAt = DateTime.UtcNow;
        sub.AppStoreUrl = appStoreUrl;
        sub.GooglePlayUrl = playUrl;
        sub.AdminReviewNote = Trim(dto.Note, 500);
        sub.HandledByUserId = adminUserId;
        if (!string.IsNullOrWhiteSpace(dto.AppVersion))
            sub.CurrentAppVersion = Trim(dto.AppVersion, 40);
        else if (string.IsNullOrWhiteSpace(sub.CurrentAppVersion))
            sub.CurrentAppVersion = "1.0.0";
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await NotifyOwnerAsync(sub, "تم نشر تطبيقك",
            $"تم نشر تطبيق \"{sub.AppName}\" على متاجر التطبيقات. يمكنك متابعته وتعديله من لوحة التحكم.");
        return Map(sub);
    }

    public async Task<AdminMobileAppSubscriptionDto> RejectPublishAsync(long id, long adminUserId, ReviewMobileAppPublishDto dto)
    {
        var sub = await GetSubscriptionForReviewAsync(id);
        if (sub.PublishStatus != "Submitted" && sub.PublishStatus != "InReview")
            throw new InvalidOperationException("لا يمكن رفض الطلب في الحالة الحالية");

        var note = Trim(dto.Note, 500);
        if (string.IsNullOrEmpty(note))
            throw new InvalidOperationException("يرجى كتابة سبب الرفض");

        sub.PublishStatus = "Rejected";
        sub.AdminReviewNote = note;
        sub.HandledByUserId = adminUserId;
        sub.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await NotifyOwnerAsync(sub, "تعديلات مطلوبة على تطبيقك",
            $"يتطلب تطبيقك بعض التعديلات قبل النشر. السبب: {note}");
        return Map(sub);
    }

    private async Task<StoreAppSubscription> GetSubscriptionForReviewAsync(long id)
    {
        return await _context.StoreAppSubscriptions
            .Include(s => s.Store).Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == id)
            ?? throw new InvalidOperationException("الطلب غير موجود");
    }

    private async Task NotifyOwnerAsync(StoreAppSubscription sub, string title, string body)
    {
        try
        {
            if (sub.Store != null)
            {
                await _notificationService.CreateAsync(
                    sub.Store.OwnerUserId, title, body, NotificationType.General,
                    "/dashboard/store-settings?tab=mobileApp");
            }
        }
        catch { }
    }

    private async Task<StoreAppSubscription> GetActiveSubscriptionForStoreAsync(long storeId)
    {
        var sub = await _context.StoreAppSubscriptions
            .Where(s => s.StoreId == storeId &&
                        !(s.Status == SubscriptionStatus.Cancelled && s.PaymentStatus != "Paid"))
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("لا يوجد اشتراك في خدمة تطبيقات الجوال");

        return sub;
    }

    private static string? Trim(string? value, int max)
    {
        var v = (value ?? string.Empty).Trim();
        if (v.Length == 0) return null;
        return v.Length > max ? v[..max] : v;
    }

    private static List<string> ParseScreenshots(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<string>();
        try
        {
            var list = JsonSerializer.Deserialize<List<string>>(json!);
            return list ?? new List<string>();
        }
        catch { return new List<string>(); }
    }

    private static string? SerializeScreenshots(List<string>? list)
    {
        if (list == null || list.Count == 0) return null;
        var clean = list.Where(s => !string.IsNullOrWhiteSpace(s)).Select(s => s.Trim()).Take(12).ToList();
        return clean.Count == 0 ? null : JsonSerializer.Serialize(clean);
    }

    private static AppNotificationDto MapNotification(StoreAppNotification n) => new()
    {
        Id = n.Id,
        Title = n.Title,
        Body = n.Body,
        Kind = n.Kind,
        AutomatedKey = n.AutomatedKey,
        ImageUrl = n.ImageUrl,
        ScheduledAt = n.ScheduledAt,
        SentAt = n.SentAt,
        Status = n.Status,
        RecipientsCount = n.RecipientsCount,
        OpensCount = n.OpensCount,
        CreatedAt = n.CreatedAt
    };

    private static AdminMobileAppSubscriptionDto Map(StoreAppSubscription s) => new()
    {
        Id = s.Id,
        StoreId = s.StoreId,
        StoreName = s.Store?.StoreName ?? string.Empty,
        StoreSlug = s.Store?.StoreSlug ?? string.Empty,
        PackageName = s.Package?.PackageName ?? string.Empty,
        Status = s.Status.ToString(),
        PaymentStatus = s.PaymentStatus,
        PublishStatus = s.PublishStatus,
        BillingCycle = s.BillingCycle.ToString(),
        DueAmount = s.DueAmount,
        AppName = s.AppName,
        DeveloperAccountType = s.DeveloperAccountType,
        DeveloperAccountInfo = s.DeveloperAccountInfo,
        MerchantNotes = s.MerchantNotes,
        AdminNote = s.AdminNote,
        AdminReviewNote = s.AdminReviewNote,
        ListingShortDescription = s.ListingShortDescription,
        ListingDescription = s.ListingDescription,
        ListingIconUrl = s.ListingIconUrl,
        ListingCategory = s.ListingCategory,
        ListingScreenshots = ParseScreenshots(s.ListingScreenshotsJson),
        SubmittedAt = s.SubmittedAt,
        AppStoreUrl = s.AppStoreUrl,
        GooglePlayUrl = s.GooglePlayUrl,
        StartDate = s.StartDate,
        EndDate = s.EndDate,
        CompletedAt = s.CompletedAt,
        CreatedAt = s.CreatedAt,
        DesignJson = s.DesignJson,
        Tagline = s.Tagline,
        CurrentAppVersion = s.CurrentAppVersion,
        ListingKeywords = s.ListingKeywords,
        ListingSupportEmail = s.ListingSupportEmail,
        ListingPrivacyUrl = s.ListingPrivacyUrl,
        HasApk = s.Builds != null && s.Builds.Any(b => b.Status == "Succeeded"),
        LastBuildAt = s.Builds != null
            ? s.Builds.Where(b => b.Status == "Succeeded").Max(b => (DateTime?)b.FinishedAt)
            : null,
    };
}
