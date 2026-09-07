namespace FatooraRahatak.Application.DTOs.Admin;

public class SendNotificationDto
{
    public string RecipientType { get; set; } = "All"; // All, Specific
    public long? StoreId { get; set; }
    public string Type { get; set; } = "General"; // Update, Maintenance, Offer
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}
