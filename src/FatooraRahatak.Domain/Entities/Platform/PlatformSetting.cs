namespace FatooraRahatak.Domain.Entities.Platform;

public class PlatformSetting
{
    public long Id { get; set; }
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}