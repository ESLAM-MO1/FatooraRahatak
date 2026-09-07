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
    public string? ShippingMethod { get; set; }
    public string? PaymentMethod { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public FatooraRahatak.Application.DTOs.Payment.BankTransferInfoDto? BankTransfer { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<OwnerOrderItemDto> Items { get; set; } = new();
    public List<OwnerOrderStatusHistoryDto> StatusHistory { get; set; } = new();
    public List<OwnerOrderShipmentDto> Shipments { get; set; } = new();
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

public class OwnerOrderShipmentDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public long? ShippingCompanyId { get; set; }
    public string ShippingCompanyName { get; set; } = string.Empty;
    public string ShippingCompanyCode { get; set; } = string.Empty;
    public string Awb { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? LabelUrl { get; set; }
    public string DestinationCity { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal? CodAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public bool IsSimulation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public List<OwnerOrderShipmentEventDto> Events { get; set; } = new();
}

public class OwnerOrderShipmentEventDto
{
    public long Id { get; set; }
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? EventAt { get; set; }
}