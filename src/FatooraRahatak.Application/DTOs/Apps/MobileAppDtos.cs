namespace FatooraRahatak.Application.DTOs.Apps;

// طلب الاشتراك في خدمة صناعة تطبيقات الجوال من قِبَل التاجر.
public class SubscribeMobileAppDto
{
    public string BillingCycle { get; set; } = "Monthly";
    public string DeveloperAccountType { get; set; } = "Company";
    public string? DeveloperAccountInfo { get; set; }
    public string? MerchantNotes { get; set; }
    public string? AppName { get; set; }
}

// حالة اشتراك المتجر في خدمة صناعة تطبيقات الجوال (لواجهة التاجر).
public class MobileAppSubscriptionDto
{
    public long? Id { get; set; }
    public long StoreId { get; set; }
    public string PackageName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string BillingCycle { get; set; } = "Monthly";
    public decimal DueAmount { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    public bool IsAvailable { get; set; }
    public bool AutoRenew { get; set; }
    public string? AppName { get; set; }
    public string DeveloperAccountType { get; set; } = "Company";
    public string? DeveloperAccountInfo { get; set; }
    public string? MerchantNotes { get; set; }
    public string? AdminNote { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int? DaysRemaining { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime? CreatedAt { get; set; }

    // ── عناصر مطابقة لصانع تطبيقات سلة ──
    // مرحلة النشر: Draft / Submitted / InReview / Published / Rejected.
    public string PublishStatus { get; set; } = "Draft";
    public string? AdminReviewNote { get; set; }

    // الخطوة الحالية في المسار (صمّم → اشترك → أطلق).
    public string CurrentStep { get; set; } = "design";

    // إعدادات التصميم (JSON) لصانع التطبيقات.
    public string? DesignJson { get; set; }

    // بيانات صفحة النشر في متجر التطبيقات.
    public string? ListingShortDescription { get; set; }
    public string? ListingDescription { get; set; }
    public string? ListingKeywords { get; set; }
    public string? ListingCategory { get; set; }
    public string? ListingIconUrl { get; set; }
    public List<string> ListingScreenshots { get; set; } = new();
    public string? ListingSupportEmail { get; set; }
    public string? ListingPrivacyUrl { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
    public string? AppStoreUrl { get; set; }
    public string? GooglePlayUrl { get; set; }
    public string? CurrentAppVersion { get; set; }
    public int DownloadCount { get; set; }
    public int SalesCount { get; set; }
}

// حفظ تصميم التطبيق من مصمّم السحب والإفلات.
public class SaveMobileAppDesignDto
{
    // التصميم كاملًا بصيغة JSON (يتضمّن الأقسام، الألوان، العناصر…).
    public string? DesignJson { get; set; }
    public string? AppName { get; set; }
}

// إرسال التطبيق للإطلاق (نشر) من التاجر ليدخل مراجعة فريق المنصة.
public class SubmitMobileAppPublishDto
{
    public string? AppName { get; set; }
    public string? ListingShortDescription { get; set; }
    public string? ListingDescription { get; set; }
    public string? ListingKeywords { get; set; }
    public string? ListingCategory { get; set; }
    public string? ListingIconUrl { get; set; }
    public List<string>? ListingScreenshots { get; set; }
    public string? ListingSupportEmail { get; set; }
    public string? ListingPrivacyUrl { get; set; }
}

// إجراء فريق المنصة على طلب النشر: بدء المراجعة / النشر / الرفض.
public class ReviewMobileAppPublishDto
{
    public string? Note { get; set; }
    public string? AppStoreUrl { get; set; }
    public string? GooglePlayUrl { get; set; }
    public string? AppVersion { get; set; }
}

// ── الإشعارات ──
public class AppNotificationDto
{
    public long Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Kind { get; set; } = "Instant";
    public string? AutomatedKey { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? ScheduledAt { get; set; }
    public DateTime? SentAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public int RecipientsCount { get; set; }
    public int OpensCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SendAppNotificationDto
{
    // نوع الإشعار: Instant (فوري) / Scheduled (مجدول).
    public string Kind { get; set; } = "Instant";
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public DateTime? ScheduledAt { get; set; }
}

// الإشعارات المؤتمتة (تتبع الطلب، السلة المتروكة، عودة المنتج…).
public class AutomatedAppNotificationDto
{
    public string Key { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool Enabled { get; set; }
}

// ── الإحصاءات ──
public class AppAnalyticsPointDto
{
    public DateTime Date { get; set; }
    public int Installs { get; set; }
    public int Sessions { get; set; }
    public int Orders { get; set; }
    public decimal Revenue { get; set; }
    public int NewCustomers { get; set; }
}

public class AppAnalyticsDto
{
    public int TotalInstalls { get; set; }
    public int TotalSessions { get; set; }
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TotalNewCustomers { get; set; }
    public int DownloadCount { get; set; }
    public int SalesCount { get; set; }
    public List<AppAnalyticsPointDto> Daily { get; set; } = new();
}

// عنصر إداري في قائمة اشتراكات التطبيقات.
public class AdminMobileAppSubscriptionDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string PackageName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentStatus { get; set; } = string.Empty;
    public string PublishStatus { get; set; } = "Draft";
    public string BillingCycle { get; set; } = "Monthly";
    public decimal DueAmount { get; set; }
    public string? AppName { get; set; }
    public string DeveloperAccountType { get; set; } = "Company";
    public string? DeveloperAccountInfo { get; set; }
    public string? MerchantNotes { get; set; }
    public string? AdminNote { get; set; }
    public string? AdminReviewNote { get; set; }
    public string? ListingShortDescription { get; set; }
    public string? ListingDescription { get; set; }
    public string? ListingIconUrl { get; set; }
    public string? ListingCategory { get; set; }
    public List<string> ListingScreenshots { get; set; } = new();
    public DateTime? SubmittedAt { get; set; }
    public string? AppStoreUrl { get; set; }
    public string? GooglePlayUrl { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// إجراء الأدمن على طلب اشتراك: اعتماد المتابعة (Complete) أو الرفض (Reject).
public class UpdateMobileAppSubscriptionDto
{
    public string? AdminNote { get; set; }
}
