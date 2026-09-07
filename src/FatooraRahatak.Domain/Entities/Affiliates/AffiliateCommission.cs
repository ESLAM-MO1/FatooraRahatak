using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Affiliates;

public class AffiliateCommission : BaseEntity
{
    public long ReferralId { get; set; }
    public long StoreId { get; set; }
    public long SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public decimal Rate { get; set; }
    public string Currency { get; set; } = "SAR";
    public AffiliateCommissionStatus Status { get; set; } = AffiliateCommissionStatus.Pending;
    public DateTime? PaidAt { get; set; }

    public Referral Referral { get; set; } = null!;
}
