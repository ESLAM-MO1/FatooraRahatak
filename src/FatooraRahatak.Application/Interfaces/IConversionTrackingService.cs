using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Application.Interfaces;

/// <summary>
/// تتبع التحويلات من طرف السيرفر (Server-side Conversion Tracking) لقنوات الإعلان
/// — Meta Conversions API لفيسبوك/انستجرام، و GA4 Measurement Protocol لجوجل (يُغذي تحويلات Google Ads
/// عبر ربط GA4 بحساب Google Ads). هذا أدق وأكثر ثباتًا من بيكسل المتصفح وحده لأنه لا يتأثر
/// بحظر المتصفح لملفات تتبع الطرف الثالث (Ad blockers / ITP / Safari).
/// </summary>
public interface IConversionTrackingService
{
    /// <summary>يُستدعى بعد نجاح إنشاء الطلب لإرسال حدث "شراء" لكل قناة مُفعّل عليها التتبع من السيرفر.</summary>
    Task TrackPurchaseAsync(
        Store store,
        Order order,
        string? customerEmail,
        string? customerPhone,
        string? eventSourceUrl,
        string? fbClickId,
        string? fbBrowserId,
        string? gaClientId);

    /// <summary>إرسال حدث تجريبي للتأكد من صحة الإعداد (Access Token / API Secret) قبل الاعتماد عليه فعليًا.</summary>
    Task<(bool Success, string Message)> SendTestEventAsync(Store store, string channel, string code, string accessToken);
}