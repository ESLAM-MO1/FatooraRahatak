using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Payments;

public class StorePaymentCredential : BaseEntity
{
    public long StoreId { get; set; }
    public PaymentProviderType Provider { get; set; }
    public string? PublicKey { get; set; }
    public string? SecretKeyEncrypted { get; set; }
    public string? MerchantCode { get; set; }
    public string? NotificationTokenEncrypted { get; set; }
    public bool IsEnabled { get; set; }
    public bool IsTestMode { get; set; }

    public Store Store { get; set; } = null!;
}
