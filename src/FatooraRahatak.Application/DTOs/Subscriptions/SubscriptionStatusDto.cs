namespace FatooraRahatak.Application.DTOs.Subscriptions;

public class SubscriptionStatusDto
{
    public string CurrentPackage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime BillingCycleDate { get; set; }
    public DateTime? GracePeriodEnd { get; set; }
    public decimal Balance { get; set; }
    public int CurrentProductsCount { get; set; }
    public int? MaxProducts { get; set; }
    public int CurrentEmployeesCount { get; set; }
    public int MaxEmployees { get; set; }
    public int CurrentWarehousesCount { get; set; }
    public int MaxWarehouses { get; set; }
    public int MaxThemes { get; set; } = 1;
    public string BillingCycle { get; set; } = "Monthly";
    public DateTime? SubscriptionEndDate { get; set; }
    public int? DaysRemaining { get; set; }
    public bool RequiresRenewal { get; set; }
    public string? SubscriptionStatus { get; set; }

    // مزايا الباقة الحالية — يستخدمها الواجهة الأمامية لعرض حالة "الميزة مقيدة"
    // قبل استدعاء أي API خاص بميزة غير متاحة، بدلاً من انتظار رسالة خطأ من السيرفر.
    public bool HasPos { get; set; }
    public bool HasPayroll { get; set; }
    public bool HasAccountingFull { get; set; }
    public bool HasZatcaInvoice { get; set; }
    public bool HasCustomDomain { get; set; }
    public bool HasLogo { get; set; }
    public bool HasApiAccess { get; set; }
    public bool HasAffiliateMarketing { get; set; }
    public bool HasShippingIntegration { get; set; }
    public bool HasShippingCalculator { get; set; }
    public bool HasShippingTracking { get; set; }
    public bool HasShippingLabelPrinting { get; set; }
    public bool HasFreeShipping { get; set; }
    public bool HasCashOnDelivery { get; set; }
    public bool HasShippingDiscounts { get; set; }
}