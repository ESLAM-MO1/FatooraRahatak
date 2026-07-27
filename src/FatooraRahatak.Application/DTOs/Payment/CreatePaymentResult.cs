namespace FatooraRahatak.Application.DTOs.Payment;

public class CreatePaymentResult
{
    public bool Success { get; set; }
    public string? PaymentReference { get; set; }
    public string? PaymentLinkUrl { get; set; }
    public string? ProviderPaymentId { get; set; }
    public string Message { get; set; } = string.Empty;
}