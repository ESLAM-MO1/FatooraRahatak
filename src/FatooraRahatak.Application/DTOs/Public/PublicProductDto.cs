namespace FatooraRahatak.Application.DTOs.Public;

public class PublicProductDto
{
    public long Id { get; set; }
    public long? CategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string Sku { get; set; } = string.Empty;
    public int AvailableQuantity { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public double AverageRating { get; set; }
    public int RatingCount { get; set; }
}

public class PublicProductImageDto
{
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int SortOrder { get; set; }
}

public class PublicProductVariantDto
{
    public long Id { get; set; }
    public string VariantName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public decimal PriceAdjustment { get; set; }
    public string? Image { get; set; }
    public int AvailableQuantity { get; set; }
}

public class PublicProductDetailDto
{
    public long Id { get; set; }
    public long? CategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public string Sku { get; set; } = string.Empty;
    public bool HasVariants { get; set; }
    public int AvailableQuantity { get; set; }
    public double AverageRating { get; set; }
    public int RatingCount { get; set; }
    public List<PublicProductImageDto> Images { get; set; } = new();
    public List<PublicProductVariantDto> Variants { get; set; } = new();
}