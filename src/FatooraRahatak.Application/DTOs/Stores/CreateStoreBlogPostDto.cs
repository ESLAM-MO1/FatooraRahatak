namespace FatooraRahatak.Application.DTOs.Stores;

public class CreateStoreBlogPostDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string SlugAr { get; set; } = string.Empty;
    public string SlugEn { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}