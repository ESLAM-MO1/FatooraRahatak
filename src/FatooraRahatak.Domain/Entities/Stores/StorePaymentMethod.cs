using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Stores;

public class StorePaymentMethod : BaseEntity
{
    public long StoreId { get; set; }
    public PaymentMethodType Type { get; set; }
    public bool IsEnabled { get; set; }

    public Store Store { get; set; } = null!;
}