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

    // تتبع التسويق: مصدر الزيارة (utm_source) والحملة (utm_campaign) — يُلتقط من رابط
    // الإعلان وتُحفظ مع الطلب لعرض أداء القنوات في لوحة التسويق.
    public string? MarketingSource { get; set; }
    public string? MarketingCampaign { get; set; }

    // تتبع التحويلات من السيرفر (Server-side Conversion Tracking): بتُلتقط من الكوكيز/الرابط في صفحة
    // الدفع وتتبعت مع الطلب عشان تتبعت لـ Meta Conversions API و GA4 Measurement Protocol بدقة أعلى
    // من بيكسل المتصفح وحده (غير متأثرة بحظر أدوات تتبع الطرف الثالث).
    public string? GaClientId { get; set; }      // قيمة كوكي _ga (بدون بادئة GA1.x.)
    public string? FbClickId { get; set; }        // قيمة كوكي _fbc أو fbclid من الرابط
    public string? FbBrowserId { get; set; }       // قيمة كوكي _fbp
}