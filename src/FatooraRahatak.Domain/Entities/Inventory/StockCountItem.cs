using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class StockCountItem : BaseEntity
{
    public long StockCountId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int SystemQuantity { get; set; }
    public int? CountedQuantity { get; set; }
    public int Variance => (CountedQuantity ?? 0) - SystemQuantity;

    public StockCount StockCount { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}