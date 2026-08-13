using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Shipping;

public class Shipment : BaseEntity
{
    public long StoreId { get; set; }
    public long OrderId { get; set; }
    public long? ShippingCompanyId { get; set; }
    public string Awb { get; set; } = string.Empty;
    public ShipmentStatus Status { get; set; } = ShipmentStatus.Pending;
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
    public DateTime? LastSyncedAt { get; set; }

    public ShippingCompany? ShippingCompany { get; set; }
    public Order? Order { get; set; }
    public ICollection<ShipmentEvent> Events { get; set; } = new List<ShipmentEvent>();
}
