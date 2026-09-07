namespace FatooraRahatak.Application.DTOs.Payment;

public class PaymentListDto
{
    public long Id { get; set; }
    public string PaymentReference { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Status { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
    public long? InvoiceId { get; set; }
    public long? OrderId { get; set; }
    public long? SubscriptionId { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime? FailedAt { get; set; }
    public DateTime? RefundedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
