namespace FatooraRahatak.Application.DTOs.Admin;

public class PlatformSettingDto
{
    public string SettingKey { get; set; } = string.Empty;
    public string SettingValue { get; set; } = string.Empty;
}

public class UpdatePlatformSettingsDto
{
    public List<PlatformSettingDto> Settings { get; set; } = new();
}