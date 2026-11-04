using System.ComponentModel.DataAnnotations;
using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Packages;

// اشتراك المتجر في خدمة "صناعة تطبيقات الجوال".
// يماثل نموذج Subscription القائم: يُنشأ بحالة Pending مع مبلغ DueAmount،
// ثم يُفعَّل عند نجاح الدفع عبر مسار الدفع الإلكتروني نفسه (Moyasar).
//
// بعد الدفع يمرّ الطلب بمراحل النشر نفسها التي يمرّ بها صانع تطبيقات سلة:
//   DesignConfirmed (صمّم) → Subscribed (اشترك) → Submitted (أطلق → قيد مراجعة الفريق)
//   → InReview (مراجعة فريق المنصة) → Published (منشور) / Rejected (مرفوض).
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
    // أو "Platform" (تتولّى المنصة إنشاء الحساب مقابل رسوم إضافية، مثل سلة).
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

    // ── مرحلة التصميم (صمّم) ──
    // إعدادات تصميم التطبيق (الأقسام، الألوان، الترتيب…) بصيغة JSON،
    // متوافقة مع قالب التطبيق الأصلي وتُعدَّل لاحقًا من لوحة تحكم المتجر.
    public string? DesignJson { get; set; }

    // ── مرحلة الإطلاق (أطلق) ──
    // حالة النشر: Draft / Submitted / InReview / Published / Rejected.
    [MaxLength(20)]
    public string PublishStatus { get; set; } = "Draft";

    [MaxLength(500)]
    public string? AdminReviewNote { get; set; }

    [MaxLength(1000)]
    public string? ListingShortDescription { get; set; }

    [MaxLength(4000)]
    public string? ListingDescription { get; set; }

    [MaxLength(200)]
    public string? ListingKeywords { get; set; }

    [MaxLength(100)]
    public string? ListingCategory { get; set; }

    [MaxLength(500)]
    public string? ListingIconUrl { get; set; }

    // لقطات شاشة التطبيق، بصيغة JSON مصفوفة روابط.
    public string? ListingScreenshotsJson { get; set; }

    [MaxLength(500)]
    public string? ListingSupportEmail { get; set; }

    [MaxLength(500)]
    public string? ListingPrivacyUrl { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? PublishedAt { get; set; }

    [MaxLength(500)]
    public string? AppStoreUrl { get; set; }

    [MaxLength(500)]
    public string? GooglePlayUrl { get; set; }

    // نسخة التطبيق الحالية، تُزاد عند كل تحديث يُنشر.
    [MaxLength(40)]
    public string? CurrentAppVersion { get; set; }

    public int DownloadCount { get; set; }
    public int SalesCount { get; set; }

    public Store Store { get; set; } = null!;
    public Package Package { get; set; } = null!;
}
