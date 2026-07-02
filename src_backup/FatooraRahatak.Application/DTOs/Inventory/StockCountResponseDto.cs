namespace FatooraRahatak.Application.DTOs.Inventory;

public class StockCountResponseDto
{
    public long Id { get; set; }
    public long WarehouseId { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<StockCountItemDto> Items { get; set; } = new();
}

public class StockCountItemDto
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public string ProductNameAr { get; set; } = string.Empty;
    public long? VariantId { get; set; }
    public int SystemQuantity { get; set; }
    public int? CountedQuantity { get; set; }
    public int Variance { get; set; }
}