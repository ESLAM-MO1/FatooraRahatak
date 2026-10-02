namespace FatooraRahatak.Application.DTOs.Admin;

public class NotificationHistoryDto
{
    public long Id { get; set; }
    public string AdminName { get; set; } = string.Empty;
    public string RecipientType { get; set; } = string.Empty;
    public long? StoreId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int RecipientsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}
