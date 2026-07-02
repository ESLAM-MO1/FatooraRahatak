namespace FatooraRahatak.Application.DTOs.Products;

public class CreateProductDto
{
    public long? CategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? Sku { get; set; } // لو فاضي، هنولده تلقائيًا
    public string? Barcode { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal CostPrice { get; set; } = 0;
    public decimal? Weight { get; set; }
    public int InitialQuantity { get; set; } = 0; // الكمية الابتدائية في المستودع الافتراضي
}