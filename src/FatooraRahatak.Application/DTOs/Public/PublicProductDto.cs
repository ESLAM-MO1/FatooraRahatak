namespace FatooraRahatak.Application.DTOs.Public;

public class PublicProductDto
{
    public long Id { get; set; }
    public string? Slug { get; set; }
    public string ProductType { get; set; } = "Physical";
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
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public long Id { get; set; }
    public string? Slug { get; set; }
    public string ProductType { get; set; } = "Physical";
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
    public bool HasWarranty { get; set; }
    public int? WarrantyMonths { get; set; }
    public int? PrepTimeMinutes { get; set; }
    public string? IngredientsText { get; set; }
    public bool HasDigitalFile { get; set; }
    public int CardCodesAvailable { get; set; }
    public List<PublicProductImageDto> Images { get; set; } = new();
    public List<PublicProductVariantDto> Variants { get; set; } = new();
    public List<PublicBundleItemDto> BundleContents { get; set; } = new();
}

public class PublicBundleItemDto
{
    public long ProductId { get; set; }
    public string? Slug { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}