namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdateStoreSettingsDto
{
    public bool IsSearchEnabled { get; set; }
    public bool IsReviewsEnabled { get; set; }
    public int? LowStockThreshold { get; set; }
    public bool IsCouponsEnabled { get; set; }
    public bool CustomerNotificationEmail { get; set; }
    public bool CustomerNotificationWhatsapp { get; set; }
    public string? TrustBadgesJson { get; set; }
    public int? ReturnPolicyDays { get; set; }
}
