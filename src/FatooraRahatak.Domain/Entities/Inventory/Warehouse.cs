using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class Warehouse : BaseEntity
{
    public long StoreId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string? Address { get; set; }
    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public Store Store { get; set; } = null!;
    public ICollection<InventoryStock> StockItems { get; set; } = new List<InventoryStock>();
}