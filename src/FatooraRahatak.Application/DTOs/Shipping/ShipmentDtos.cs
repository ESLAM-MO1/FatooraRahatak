namespace FatooraRahatak.Application.DTOs.Shipping;

public class CreateShipmentDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public long ShippingCompanyId { get; set; }
    public decimal Weight { get; set; }
    public string? Notes { get; set; }
}

public class ShipmentDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public long? ShippingCompanyId { get; set; }
    public string ShippingCompanyName { get; set; } = string.Empty;
    public string ShippingCompanyCode { get; set; } = string.Empty;
    public string Awb { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? LabelUrl { get; set; }
    public string DestinationCity { get; set; } = string.Empty;
    public string DestinationAddress { get; set; } = string.Empty;
    public string? RecipientName { get; set; }
    public string? RecipientPhone { get; set; }
    public decimal Weight { get; set; }
    public decimal? CodAmount { get; set; }
    public decimal ShippingCost { get; set; }
    public string Currency { get; set; } = "SAR";
    public string? Notes { get; set; }
    public bool IsSimulation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public List<ShipmentEventDto> Events { get; set; } = new();
}

public class ShipmentListDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string ShippingCompanyName { get; set; } = string.Empty;
    public string ShippingCompanyCode { get; set; } = string.Empty;
    public string Awb { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string DestinationCity { get; set; } = string.Empty;
    public decimal ShippingCost { get; set; }
    public bool IsSimulation { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastSyncedAt { get; set; }
}

public class ShipmentEventDto
{
    public long Id { get; set; }
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? EventAt { get; set; }
}

public class UpdateShipmentStatusDto
{
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
}

public class SyncShipmentResultDto
{
    public long ShipmentId { get; set; }
    public string Awb { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool Synced { get; set; }
    public string? Message { get; set; }
    public List<ShipmentEventDto> Events { get; set; } = new();
}