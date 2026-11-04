namespace FatooraRahatak.Application.Interfaces;

using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Domain.Enums;

// خدمة اشتراك "صناعة تطبيقات الجوال".
public interface IMobileAppSubscriptionService
{
    // حالة اشتراك المتجر الحالي (منعًا: الباقة المجانية ⇒ IsAvailable=false).
    Task<MobileAppSubscriptionDto> GetStatusAsync(long storeId);

    // إنشاء طلب اشتراك بحالة Pending مع احتساب المستحق على حسب الباقة ودورة الفوترة.
    Task<MobileAppSubscriptionDto> SubscribeAsync(long storeId, long userId, SubscribeMobileAppDto dto);

    // تفعيل الاشتراك بعد نجاح الدفع (يُستدعى من ويب هوك الدفع).
    Task ActivateOnPaymentAsync(long appSubscriptionId);

    // إلغاء الاشتراك (لا يمسّ اشتراك المنصة).
    Task CancelAsync(long storeId);

    // قائمة إدارية بكل طلبات واشتراكات التطبيقات.
    Task<List<AdminMobileAppSubscriptionDto>> GetAllAsync(string? status);

    // اعتماد المعالجة من الأدمن (يبدأ التنفيذ ويُعلَّم الطلب كمكتمل).
    Task<AdminMobileAppSubscriptionDto> CompleteAsync(long id, long adminUserId, UpdateMobileAppSubscriptionDto dto);

    // رفض الطلب من الأدمن.
    Task<AdminMobileAppSubscriptionDto> RejectAsync(long id, long adminUserId, UpdateMobileAppSubscriptionDto dto);
}
