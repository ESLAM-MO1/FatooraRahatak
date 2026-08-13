namespace FatooraRahatak.Application.DTOs.Public;

public class PublicOrderDetailDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public decimal TotalAmount { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ShippingMethod { get; set; }
    public string? PaymentMethod { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public FatooraRahatak.Application.DTOs.Payment.BankTransferInfoDto? BankTransfer { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<PublicOrderItemDto> Items { get; set; } = new();
    public List<PublicOrderStatusHistoryDto> StatusHistory { get; set; } = new();
    public List<PublicShipmentDto> Shipments { get; set; } = new();
}

public class PublicShipmentDto
{
    public long Id { get; set; }
    public string Awb { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string ShippingCompanyName { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public List<PublicShipmentEventDto> Events { get; set; } = new();
}

public class PublicShipmentEventDto
{
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? EventAt { get; set; }
}

public class PublicOrderItemDto
{
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal LineTotal { get; set; }
}

public class PublicOrderStatusHistoryDto
{
    public string Status { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
}