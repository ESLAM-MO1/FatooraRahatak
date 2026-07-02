namespace FatooraRahatak.Application.DTOs.Products;

public class VariantResponseDto
{
    public long Id { get; set; }
    public string VariantName { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal PriceAdjustment { get; set; }
    public int AvailableQuantity { get; set; }
    public List<VariantAttributeDto> Attributes { get; set; } = new();
}