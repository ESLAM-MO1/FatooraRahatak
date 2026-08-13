namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdateStoreThemeDto
{
    public string ThemeName { get; set; } = "professional-blue";
    public string? ColorsJson { get; set; }
    public string? CoverImage { get; set; }
}
