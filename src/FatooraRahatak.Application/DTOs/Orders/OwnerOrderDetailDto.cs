namespace FatooraRahatak.Application.DTOs.Orders;

public class OwnerOrderDetailDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public string? CustomerEmail { get; set; }
    public bool IsGuest { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OwnerOrderItemDto> Items { get; set; } = new();
    public List<OwnerOrderStatusHistoryDto> StatusHistory { get; set; } = new();
}

public class OwnerOrderItemDto
{
    public long ProductId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal LineTotal { get; set; }
}

public class OwnerOrderStatusHistoryDto
{
    public string Status { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}