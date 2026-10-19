namespace FatooraRahatak.Application.DTOs.Payment;

public class CreatePaymentResult
{
    public bool Success { get; set; }
    public string? PaymentReference { get; set; }
    public string? PaymentLinkUrl { get; set; }
    public string? ProviderPaymentId { get; set; }
    public BankTransferInfoDto? BankTransfer { get; set; }
    public string Message { get; set; } = string.Empty;

    // Moyasar publishable (public) key - safe to expose to the browser so the in-page
    // payment form can pay the created invoice without redirecting off-site.
    public string? PublishableKey { get; set; }

    // Invoice amount in halalas (same value sent to Moyasar) - the in-page payment form
    // must be initialized with the exact amount of the invoice.
    public int? AmountHalalas { get; set; }
}