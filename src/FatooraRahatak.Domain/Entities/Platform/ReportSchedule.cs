using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform;

public class ReportSchedule : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Frequency { get; set; } = "Weekly"; // Daily / Weekly / Monthly
    public string ReportScope { get; set; } = "Business"; // Business / Platform
    public string? KpisJson { get; set; }
    public string? RecipientsJson { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
    public DateTime NextRunAt { get; set; } = DateTime.UtcNow.AddHours(1);
}
