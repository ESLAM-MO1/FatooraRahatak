namespace FatooraRahatak.Application.DTOs.Payment;

public class PayPalWebhookPayload
{
    public string? EventType { get; set; }
    public string? OrderId { get; set; }
    public string? CaptureId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
}

public class BankTransferResult
{
    public bool Success { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? Reference { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class BankTransferInfoDto
{
    public string? BankName { get; set; }
    public string? AccountHolder { get; set; }
    public string? Iban { get; set; }
    public string? ReceiptUrl { get; set; }
    public string? TransferReference { get; set; }
}

public class SubmitBankTransferReceiptDto
{
    public string ReceiptUrl { get; set; } = string.Empty;
    public string? Reference { get; set; }
}
