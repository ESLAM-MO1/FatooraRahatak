namespace FatooraRahatak.Application.DTOs.Admin;

public class AdminThemeDto
{
    public long Id { get; set; }
    public string ThemeKey { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public int DisplayOrder { get; set; }
}

public class UpdateThemeDto
{
    public bool IsEnabled { get; set; }
}
