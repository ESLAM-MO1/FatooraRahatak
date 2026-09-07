using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Shipping;

public class ShippingCompany : BaseEntity
{
    public long StoreId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ShippingCompanyCode Code { get; set; } = ShippingCompanyCode.Manual;
    public string? ApiBaseUrl { get; set; }
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public bool Enabled { get; set; } = true;
    public bool IsDefault { get; set; }
    public string? RateConfigJson { get; set; }
    public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
}
