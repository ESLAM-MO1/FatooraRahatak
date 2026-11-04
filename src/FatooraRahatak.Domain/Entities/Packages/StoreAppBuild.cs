using System.ComponentModel.DataAnnotations;
using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Packages;

// سجلّ عملية بناء APK لتطبيق متجر عبر GitHub Actions.
// يمرّ البناء بالحالات الآتية:
//   Queued (قيد الانتظار) → Running (جارٍ البناء) → Succeeded (نجح) / Failed (فشل).
// عند النجاح يُنزَّل ملف APK على السيرفر ويُربط بـ ApkPath ليُتاح للأدمن والتاجر.
public class StoreAppBuild : BaseEntity
{
    public long StoreId { get; set; }
    public long StoreAppSubscriptionId { get; set; }

    // حالة البناء: Queued / Running / Succeeded / Failed.
    [MaxLength(20)]
    public string Status { get; set; } = "Queued";

    // رقم تشغيل GitHub Actions (run id) لمتابعة الحالة وسحب النتيجة.
    public long? GithubRunId { get; set; }

    // رابط صفحة التشغيل على GitHub (للمتابعة اليدوية).
    [MaxLength(500)]
    public string? GithubRunUrl { get; set; }

    // اسم حزمة التطبيق المستخدَم في هذا البناء (مثال: sa.rahtk.mystore).
    [MaxLength(200)]
    public string? PackageName { get; set; }

    // رقم الإصدار المستخدَم في هذا البناء.
    [MaxLength(40)]
    public string? VersionName { get; set; }

    // مسار ملف APK على السيرفر بعد نجاح البناء.
    [MaxLength(500)]
    public string? ApkPath { get; set; }

    // حجم ملف APK بالبايت.
    public long? ApkSizeBytes { get; set; }

    // بصمة SHA-256 لملف APK (للتحقق من سلامته).
    [MaxLength(128)]
    public string? ApkSha256 { get; set; }

    // رسالة الخطأ في حال فشل البناء.
    [MaxLength(2000)]
    public string? ErrorMessage { get; set; }

    // آخر مخرجات مسجَّلة من البناء (اقتطاع موجز).
    [MaxLength(4000)]
    public string? LogTail { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }

    // المستخدم (الأدمن) الذي أطلق البناء.
    public long? TriggeredByUserId { get; set; }
}
