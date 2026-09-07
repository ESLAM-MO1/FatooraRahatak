using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Packages;

public class Subscription : BaseEntity
{
    public long StoreId { get; set; }
    public long PackageId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;
    public DateTime? GracePeriodEnd { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public bool AutoRenew { get; set; } = true;
    public decimal DueAmount { get; set; }

    public Store Store { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public Payment? Payment { get; set; }
}