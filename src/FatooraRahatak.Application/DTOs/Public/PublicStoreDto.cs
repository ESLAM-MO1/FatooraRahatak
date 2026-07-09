namespace FatooraRahatak.Application.DTOs.Public;

public class PublicStoreDto
{
    public long Id { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? Logo { get; set; }
    public string DefaultLanguage { get; set; } = "ar";
    public bool IsOnline { get; set; }
}

public class PublicCategoryDto
{
    public long Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Image { get; set; }
    public long? ParentCategoryId { get; set; }
}