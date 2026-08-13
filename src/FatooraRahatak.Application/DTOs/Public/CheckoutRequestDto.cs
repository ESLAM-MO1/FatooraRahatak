namespace FatooraRahatak.Application.DTOs.Public;

public class CheckoutRequestDto
{

    // جلسة السلة: اختيارية هنا حتى لا يظهر خطأ "required" إنجليزي من ASP.NET —
    // يتحقق منها OrderService برسالة عربية واضحة لو كانت ناقصة.
    public string? SessionId { get; set; }

    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestEmail { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public string? ShippingMethod { get; set; }
    public string? PaymentMethod { get; set; }
    public long? ShippingCompanyId { get; set; }
    public decimal? ShippingWeightKg { get; set; }

    // بيانات البطاقة للدفع الإلكتروني (تصل من نموذج البطاقة في صفحة الدفع)
    public string? CardHolder { get; set; }
    public string? CardNumber { get; set; }
    public string? CardExpiryMonth { get; set; }
    public string? CardExpiryYear { get; set; }
    public string? CardCvc { get; set; }
}