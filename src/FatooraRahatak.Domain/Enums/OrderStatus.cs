namespace FatooraRahatak.Domain.Enums;

public enum OrderStatus
{
    New,
    Processing,
    Shipped,
    Delivered,
    Cancelled,
    Returned,
    PendingRefund,
    // ⚠️ حالة "بانتظار الدفع" للطلبات الإلكترونية (بطاقة/PayPal/حوالة بنكية):
    // يُنشأ الطلب بهذه الحالة عند الـ Checkout بدون خصم مخزون، ولا يخرج منها
    // إلا بعد تأكيد الدفع الفعلي (webhook/فحص الحالة/تأكيد التاجر للحوالة).
    PendingPayment
}