using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Stores;

public class StoreBlogPost : BaseEntity
{
    public long StoreId { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string SlugAr { get; set; } = string.Empty;
    public string SlugEn { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Status { get; set; } = "Draft";
    public DateTime? PublishedAt { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }

    public Store Store { get; set; } = null!;
}