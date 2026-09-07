using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Notifications;

/// <summary>
/// سجل تتبُّع رسائل البريد الإلكتروني التلقائية (خاصةً تنبيهات الباقات)
/// لضمان عدم إرسال التنبيه نفسه مرتين (مثل تنبيهات اقتراب الانتهاء).
/// </summary>
public class EmailNotificationLog : BaseEntity
{
    public long? UserId { get; set; }
    public long? StoreId { get; set; }
    public long? SubscriptionId { get; set; }

    /// <summary>
    /// نوع التنبيه (مفتاح نصي مميز مثل: subscription_expiring_7d, subscription_expiring_3d ...).
    /// </summary>
    public string NotificationKey { get; set; } = string.Empty;

    /// <summary>
    /// وصف/عنوان الرسالة المرسلة.
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// البريد الذي أُرسل إليه التنبيه.
    /// </summary>
    public string RecipientEmail { get; set; } = string.Empty;

    /// <summary>
    /// هل نجح الإرسال فعليًا؟ (قد يكون فشل SMTP فيُسجَّل للاستكشاف).
    /// </summary>
    public bool Success { get; set; } = true;

    public string? ErrorMessage { get; set; }

    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
