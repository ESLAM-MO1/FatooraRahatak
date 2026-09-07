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

    // نقطة البيع (POS): بيانات البيع المعلقة (JSON) — تُخزَّن على سجل الدفع وعند
    // تأكيد الدفع تُنشأ الفاتورة. تُستخدم للدفعات الإلكترونية بدون مرجع (طلب/فاتورة/اشتراك).
    public string? PendingPosPayloadJson { get; set; }

    // نقطة البيع (POS): معرف المتجر لتحديث إجماليات الوردية عند تأكيد الدفع.
    public long? PosShiftStoreId { get; set; }

    // طريقة الدفع المطلوبة (Moyasar/CreditCard = افتراضي، BankTransfer/PayPal/Tabby/Tamara = حسب الاختيار)
    public string? PaymentMethod { get; set; }
}