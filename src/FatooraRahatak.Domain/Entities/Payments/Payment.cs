using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Payments;

public class Payment : BaseEntity
{
    public string PaymentReference { get; set; } = string.Empty;
    public long? InvoiceId { get; set; }
    public long? OrderId { get; set; }
    public long? SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public PaymentProviderType ProviderType { get; set; } = PaymentProviderType.Moyasar;
    public string? ProviderPaymentId { get; set; }
    public string? GatewayResponse { get; set; }
    public string? CallbackUrl { get; set; }
    public string? WebhookSecret { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? FailedAt { get; set; }
    public DateTime? RefundedAt { get; set; }

    public Invoice? Invoice { get; set; }
    public Order? Order { get; set; }
    public Subscription? Subscription { get; set; }
}