namespace FatooraRahatak.Application.DTOs.Stores;

public class StoreThemeResponseDto
{
    public string ThemeName { get; set; } = "basic";
    public string PrimaryColor { get; set; } = "#12a8db";
    public string? CoverImage { get; set; }
}
