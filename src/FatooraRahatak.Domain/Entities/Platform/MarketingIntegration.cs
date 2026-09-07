using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform;

public class MarketingIntegration : BaseEntity
{
    public long StoreId { get; set; }
    public string Channel { get; set; } = string.Empty; // FacebookPixel / GoogleAnalytics / TikTokPixel / SnapchatPixel / WhatsAppBusiness
    public string? Code { get; set; }
    public string? AdditionalCode { get; set; }
    public bool IsEnabled { get; set; } = true;

    // === تتبع التحويلات من طرف السيرفر (Server-side Conversion Tracking) ===
    // FacebookPixel: Access Token الخاص بـ Meta Conversions API
    // GoogleAnalytics: API Secret الخاص بـ GA4 Measurement Protocol (يُستخدم لإرسال أحداث الشراء إلى Google Ads عبر ربط GA4)
    public string? AccessToken { get; set; }
    public bool EnableServerSideTracking { get; set; } = false;

    public Store? Store { get; set; }
}