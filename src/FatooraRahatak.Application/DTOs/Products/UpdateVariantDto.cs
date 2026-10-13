namespace FatooraRahatak.Application.DTOs.Products;

public class UpdateVariantDto
{
    public string VariantName { get; set; } = string.Empty;
    public decimal PriceAdjustment { get; set; } = 0;
    public string? Barcode { get; set; }
    public string? Image { get; set; }
}
