namespace FatooraRahatak.Application.DTOs.Inventory;

public class StockItemDto
{
    public long WarehouseId { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public long ProductId { get; set; }
    public string ProductNameAr { get; set; } = string.Empty;
    public int QuantityAvailable { get; set; }
    public int QuantityReserved { get; set; }
    public int ReorderLevel { get; set; }
}