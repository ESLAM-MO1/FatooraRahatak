namespace FatooraRahatak.Application.DTOs.Inventory;

public class CreateDamagedStockDto
{
    public long WarehouseId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
}