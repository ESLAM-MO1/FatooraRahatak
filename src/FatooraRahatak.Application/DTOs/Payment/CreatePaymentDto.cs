namespace FatooraRahatak.Application.DTOs.Payment;

public class CreatePaymentDto
{
    public long? InvoiceId { get; set; }
    public long? OrderId { get; set; }
    public long? SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Description { get; set; } = string.Empty;
    public string? CallbackUrl { get; set; }
    public string? SuccessUrl { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }

    // بيانات البطاقة لإنشاء دفع مباشر عبر موياسر (source: creditcard)
    public string? CardHolder { get; set; }
    public string? CardNumber { get; set; }
    public string? CardExpiryMonth { get; set; }
    public string? CardExpiryYear { get; set; }
    public string? CardCvc { get; set; }
}