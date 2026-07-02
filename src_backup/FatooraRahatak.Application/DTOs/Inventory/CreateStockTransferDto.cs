namespace FatooraRahatak.Application.DTOs.Inventory;

public class CreateStockTransferDto
{
    public long FromWarehouseId { get; set; }
    public long ToWarehouseId { get; set; }
    public List<StockTransferItemDto> Items { get; set; } = new();
}

public class StockTransferItemDto
{
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
}