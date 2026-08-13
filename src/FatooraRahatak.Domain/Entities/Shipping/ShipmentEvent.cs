using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Shipping;

public class ShipmentEvent : BaseEntity
{
    public long ShipmentId { get; set; }
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? EventAt { get; set; }

    public Shipment Shipment { get; set; } = null!;
}
