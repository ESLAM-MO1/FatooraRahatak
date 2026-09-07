using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Stores;

public class StoreShippingMethod : BaseEntity
{
    public long StoreId { get; set; }
    public ShippingMethodType Type { get; set; }
    public bool IsEnabled { get; set; }

    public Store Store { get; set; } = null!;
}