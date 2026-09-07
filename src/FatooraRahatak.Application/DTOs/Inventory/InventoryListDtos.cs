namespace FatooraRahatak.Application.DTOs.Inventory;

public class StockTransferListDto
{
    public long Id { get; set; }
    public string FromWarehouseName { get; set; } = string.Empty;
    public string ToWarehouseName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class DamagedStockListDto
{
    public long Id { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string ProductNameAr { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool IsApproved { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class StockCountListDto
{
    public long Id { get; set; }
    public string WarehouseName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}
