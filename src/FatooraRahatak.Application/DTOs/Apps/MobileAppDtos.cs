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
    public string BillingCycle { get; set; } = "Monthly";
    public decimal DueAmount { get; set; }
    public string? AppName { get; set; }
    public string DeveloperAccountType { get; set; } = "Company";
    public string? DeveloperAccountInfo { get; set; }
    public string? MerchantNotes { get; set; }
    public string? AdminNote { get; set; }
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
