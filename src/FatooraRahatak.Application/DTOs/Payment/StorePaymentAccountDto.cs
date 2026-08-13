using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Payment;

public class StorePaymentAccountDto
{
    public PaymentAccountStatus Status { get; set; } = PaymentAccountStatus.NotSubmitted;
    public string? StoreName { get; set; }
    public string? BankName { get; set; }
    public string? AccountHolder { get; set; }
    public string? Iban { get; set; }
    public string? RecipientId { get; set; }
    public string? RejectionReason { get; set; }
}

public class SubmitStorePaymentAccountDto
{
    public string BankName { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string Iban { get; set; } = string.Empty;
}
