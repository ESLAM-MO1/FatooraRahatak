namespace FatooraRahatak.Application.DTOs.Products;

public class CreateVariantDto
{
    public string VariantName { get; set; } = string.Empty; 
    public string? Sku { get; set; }
    public string? Barcode { get; set; }
    public decimal PriceAdjustment { get; set; } = 0;
    public int InitialQuantity { get; set; } = 0;
    public List<VariantAttributeDto> Attributes { get; set; } = new();
}

public class VariantAttributeDto
{
    public string AttributeName { get; set; } = string.Empty; 
    public string AttributeValue { get; set; } = string.Empty; 
}