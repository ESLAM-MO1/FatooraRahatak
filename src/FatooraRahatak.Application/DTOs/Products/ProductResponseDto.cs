namespace FatooraRahatak.Application.DTOs.Products;

public class ProductResponseDto
{
    public long Id { get; set; }
    public long? CategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal CostPrice { get; set; }
    public decimal? Weight { get; set; }
    public string Status { get; set; } = string.Empty;
    public int AvailableQuantity { get; set; }
    public string? PrimaryImageUrl { get; set; }
    public bool HasWarranty { get; set; }
    public int? WarrantyMonths { get; set; }
    public string? Slug { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public System.DateTime? DiscountStartsAt { get; set; }
    public System.DateTime? DiscountEndsAt { get; set; }
    public string ProductType { get; set; } = "Physical";
    public int? PrepTimeMinutes { get; set; }
    public string? IngredientsText { get; set; }
    public string? DigitalFileUrl { get; set; }
    public int CardCodesCount { get; set; }
    public List<string>? CardCodes { get; set; }
    public List<BundleItemResponseDto>? BundleItems { get; set; }
}

public class BundleItemResponseDto
{
    public long ProductId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
}
