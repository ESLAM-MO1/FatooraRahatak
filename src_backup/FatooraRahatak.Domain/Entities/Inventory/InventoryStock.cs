using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class InventoryStock : BaseEntity
{
    public long WarehouseId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int QuantityAvailable { get; set; } = 0;
    public int QuantityReserved { get; set; } = 0;
    public int ReorderLevel { get; set; } = 0;

    // Navigation Properties
    public Warehouse Warehouse { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}