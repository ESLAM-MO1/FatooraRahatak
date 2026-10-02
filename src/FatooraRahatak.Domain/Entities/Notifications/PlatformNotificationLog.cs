using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Notifications;

public class PlatformNotificationLog : BaseEntity
{
    public long AdminUserId { get; set; }
    public string AdminName { get; set; } = string.Empty;
    public string RecipientType { get; set; } = "All";
    public long? StoreId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int RecipientsCount { get; set; }
}
