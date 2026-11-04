using System.ComponentModel.DataAnnotations;
using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Packages;

// الإشعارات الفورية والمجدولة والمؤتمتة التي يرسلها التاجر لعملاء تطبيقه،
// مطابقةً لما يتيحه صانع تطبيقات سلة (إشعارات مجانية غير محدودة).
public class StoreAppNotification : BaseEntity
{
    public long StoreId { get; set; }
    public long? CreatedByUserId { get; set; }

    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Body { get; set; } = string.Empty;

    // "Instant" (فوري) / "Scheduled" (مجدول) / "Automated" (مؤتمت).
    [MaxLength(20)]
    public string Kind { get; set; } = "Instant";

    // نوع الإشعار المؤتمت: OrderTracking / AbandonedCart / BackInStock ... إلخ.
    [MaxLength(40)]
    public string? AutomatedKey { get; set; }

    [MaxLength(1000)]
    public string? ImageUrl { get; set; }

    public DateTime? ScheduledAt { get; set; }
    public DateTime? SentAt { get; set; }

    // Pending / Scheduled / Sent / Cancelled.
    [MaxLength(20)]
    public string Status { get; set; } = "Instant";

    public int RecipientsCount { get; set; }
    public int OpensCount { get; set; }

    public Store Store { get; set; } = null!;
}
