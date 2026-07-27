namespace FatooraRahatak.Application.DTOs.Payment;

public class PaymentStatusResult
{
    public string PaymentReference { get; set; } = string.Empty;
    public string? ProviderPaymentId { get; set; }
    public string Status { get; set; } = "Pending";
    public decimal Amount { get; set; }
    public string? PaidAt { get; set; }
    public string Message { get; set; } = string.Empty;
}