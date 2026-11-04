using System.ComponentModel.DataAnnotations;
using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Packages;

// اشتراك المتجر في خدمة "صناعة تطبيقات الجوال".
// يماثل نموذج Subscription القائم: يُنشأ بحالة Pending مع مبلغ DueAmount،
// ثم يُفعَّل عند نجاح الدفع عبر مسار الدفع الإلكتروني نفسه (Moyasar).
public class StoreAppSubscription : BaseEntity
{
    public long StoreId { get; set; }
    public long PackageId { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Pending;
    public string PaymentStatus { get; set; } = "Pending";
    public decimal DueAmount { get; set; }
    public bool AutoRenew { get; set; } = true;

    // نوع حساب المطوّر الذي سيُنشر عليه التطبيق: "Company" (حساب شركة موجود لدى التاجر)
    // أو "Platform" (تتولّى المنصة إنشاء الحساب).
    [MaxLength(50)]
    public string DeveloperAccountType { get; set; } = "Company";

    // روابط أو بيانات حسابات المطوّر التي يُدخلها التاجر (Google Play / App Store).
    [MaxLength(1000)]
    public string? DeveloperAccountInfo { get; set; }

    // ملاحظات إضافية من التاجر عند الاشتراك.
    [MaxLength(1000)]
    public string? MerchantNotes { get; set; }

    // عنوان التطبيق المطلوب ظهوره في متجر التطبيقات.
    [MaxLength(200)]
    public string? AppName { get; set; }

    // ملاحظة إدارية تُسجَّل من الأدمن عند المعالجة أو الرفض.
    [MaxLength(1000)]
    public string? AdminNote { get; set; }

    public DateTime? CompletedAt { get; set; }
    public long? HandledByUserId { get; set; }

    public Store Store { get; set; } = null!;
    public Package Package { get; set; } = null!;
}
