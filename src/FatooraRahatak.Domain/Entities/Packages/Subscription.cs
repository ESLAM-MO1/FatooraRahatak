using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Packages;

public class Subscription : BaseEntity
{
    public long StoreId { get; set; }
    public long PackageId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    public DateTime? GracePeriodEnd { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public bool AutoRenew { get; set; } = true;

    public Store Store { get; set; } = null!;
    public Package Package { get; set; } = null!;
}