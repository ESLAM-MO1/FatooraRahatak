using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class ProductVariant : BaseEntity
{
    public long ProductId { get; set; }
    public string VariantName { get; set; } = string.Empty; 
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal PriceAdjustment { get; set; } = 0;
    public string? Image { get; set; }

    public Product Product { get; set; } = null!;
    public ICollection<VariantAttribute> Attributes { get; set; } = new List<VariantAttribute>();
}