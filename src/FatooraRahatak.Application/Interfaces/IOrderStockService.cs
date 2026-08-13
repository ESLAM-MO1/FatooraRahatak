using FatooraRahatak.Domain.Entities.Orders;

namespace FatooraRahatak.Application.Interfaces;

/// <summary>
/// عمليات المخزون المرتبطة بالطلبات (خصم عند البيع / إرجاع عند الإلغاء).
/// مشتركة بين CheckoutAsync ومسار تأكيد الدفع حتى لا يُخصم المخزون إلا بعد
/// تأكيد الدفع الفعلي، ويُعاد بنفس المنطق تمامًا عند الإلغاء.
/// </summary>
public interface IOrderStockService
{
    /// <summary>خصم كميات عناصر الطلب من المخزون مع قفل صفوف (UPDLOCK) وإنشاء حركة Sale.</summary>
    Task DeductStockAsync(Order order, long? userId = null);

    /// <summary>إرجاع كميات عناصر الطلب إلى المخزون وإنشاء حركة Return.</summary>
    Task RestockAsync(Order order, long? userId = null);
}
