namespace FatooraRahatak.Application.DTOs.Public;

public class PublicOrderDetailDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PublicOrderItemDto> Items { get; set; } = new();
}

public class PublicOrderItemDto
{
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal LineTotal { get; set; }
}