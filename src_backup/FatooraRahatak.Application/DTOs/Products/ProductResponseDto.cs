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
    public int AvailableQuantity { get; set; } // مجموع الكمية المتاحة في كل المخازن
}