using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// تنفيذ تتبع التحويلات من طرف السيرفر:
/// - FacebookPixel  → Meta Conversions API  (graph.facebook.com/{version}/{pixel_id}/events)
/// - GoogleAnalytics → GA4 Measurement Protocol (google-analytics.com/mp/collect) — يتغذى منه تحويل
///   "purchase" داخل GA4 ثم يُستورد تلقائيًا كتحويل داخل Google Ads لو الحسابين مربوطين ببعض
///   (وهي نفس الطريقة المعتمدة في منصات التجارة الإلكترونية الكبرى لأن Google Ads API الخام يحتاج
///   OAuth مستقل لكل تاجر وهو غير عملي في سياق SaaS متعدد المستأجرين).
/// </summary>
public class ConversionTrackingService : IConversionTrackingService
{
    private const string MetaApiVersion = "v20.0";
    private readonly AppDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly ILogger<ConversionTrackingService> _logger;

    public ConversionTrackingService(AppDbContext context, HttpClient httpClient, ILogger<ConversionTrackingService> logger)
    {
        _context = context;
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task TrackPurchaseAsync(
        Store store,
        Order order,
        string? customerEmail,
        string? customerPhone,
        string? eventSourceUrl,
        string? fbClickId,
        string? fbBrowserId,
        string? gaClientId)
    {
        var integrations = await _context.MarketingIntegrations
            .Where(i => i.StoreId == store.Id
                        && i.IsEnabled
                        && i.EnableServerSideTracking
                        && !string.IsNullOrWhiteSpace(i.Code)
                        && !string.IsNullOrWhiteSpace(i.AccessToken)
                        && (i.Channel == "FacebookPixel" || i.Channel == "GoogleAnalytics"))
            .ToListAsync();

        foreach (var integration in integrations)
        {
            try
            {
                if (integration.Channel == "FacebookPixel")
                {
                    await SendMetaConversionEventAsync(
                        integration.Code!, integration.AccessToken!, "Purchase", order,
                        customerEmail, customerPhone, eventSourceUrl, fbClickId, fbBrowserId, testEventCode: null);
                }
                else if (integration.Channel == "GoogleAnalytics")
                {
                    await SendGa4EventAsync(
                        integration.Code!, integration.AccessToken!, "purchase", order,
                        gaClientId, debugMode: false);
                }
            }
            catch (Exception ex)
            {
                // فشل إرسال حدث تتبع لا يجب أبدًا أن يوقف أو يفشّل عملية الطلب نفسها
                _logger.LogError(ex, "Conversion tracking failed for store {StoreId}, channel {Channel}, order {OrderNumber}",
                    store.Id, integration.Channel, order.OrderNumber);
            }
        }
    }

    public async Task<(bool Success, string Message)> SendTestEventAsync(Store store, string channel, string code, string accessToken)
    {
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(accessToken))
            return (false, "لازم تدخل المعرف (Pixel ID / Measurement ID) والـ Access Token/API Secret أولًا وتحفظهم قبل الاختبار");

        try
        {
            if (channel == "FacebookPixel")
            {
                var (ok, err) = await SendMetaConversionEventAsync(
                    code, accessToken, "Purchase", BuildFakeTestOrder(store), "test@example.com", null,
                    $"https://{store.StoreSlug}.example.com", null, null, testEventCode: "TEST12345");
                return ok
                    ? (true, "تم إرسال حدث تجريبي بنجاح إلى Meta Conversions API ✅ تحقق منه في Meta Events Manager → Test Events")
                    : (false, $"فشل الاتصال بـ Meta: {err}");
            }
            if (channel == "GoogleAnalytics")
            {
                var (ok, err) = await SendGa4EventAsync(code, accessToken, "purchase", BuildFakeTestOrder(store), gaClientId: Guid.NewGuid().ToString(), debugMode: true);
                return ok
                    ? (true, "تم إرسال حدث تجريبي بنجاح إلى GA4 Measurement Protocol ✅ تحقق منه في GA4 → DebugView")
                    : (false, $"فشل الاتصال بـ Google Analytics: {err}");
            }
            return (false, "تتبع التحويلات من السيرفر متاح حاليًا فقط لقناتي فيسبوك بيكسل وجوجل أناليتكس");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Test conversion event failed for store {StoreId}, channel {Channel}", store.Id, channel);
            return (false, "حدث خطأ غير متوقع أثناء إرسال الحدث التجريبي، تأكد من صحة البيانات المدخلة");
        }
    }

    private static Order BuildFakeTestOrder(Store store) => new()
    {
        Id = 0,
        StoreId = store.Id,
        OrderNumber = "TEST-0000",
        TotalAmount = 1.00m,
    };

    // ===================== Meta Conversions API =====================
    private async Task<(bool Success, string? Error)> SendMetaConversionEventAsync(
        string pixelId, string accessToken, string eventName, Order order,
        string? customerEmail, string? customerPhone, string? eventSourceUrl,
        string? fbClickId, string? fbBrowserId, string? testEventCode)
    {
        var userData = new Dictionary<string, object?>();
        if (!string.IsNullOrWhiteSpace(customerEmail))
            userData["em"] = new[] { Sha256Hash(customerEmail.Trim().ToLowerInvariant()) };
        if (!string.IsNullOrWhiteSpace(customerPhone))
            userData["ph"] = new[] { Sha256Hash(NormalizePhoneDigitsOnly(customerPhone)) };
        if (!string.IsNullOrWhiteSpace(fbClickId))
            userData["fbc"] = fbClickId;
        if (!string.IsNullOrWhiteSpace(fbBrowserId))
            userData["fbp"] = fbBrowserId;

        var eventPayload = new Dictionary<string, object?>
        {
            ["event_name"] = eventName,
            ["event_time"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
            ["event_id"] = order.OrderNumber, // لمنع الاحتساب المزدوج مع بيكسل المتصفح (Deduplication)
            ["action_source"] = "website",
            ["event_source_url"] = eventSourceUrl,
            ["user_data"] = userData,
            ["custom_data"] = new
            {
                currency = "SAR",
                value = order.TotalAmount,
                order_id = order.OrderNumber
            }
        };

        var body = new Dictionary<string, object?>
        {
            ["data"] = new[] { eventPayload },
            ["access_token"] = accessToken
        };
        if (!string.IsNullOrWhiteSpace(testEventCode))
            body["test_event_code"] = testEventCode;

        var url = $"https://graph.facebook.com/{MetaApiVersion}/{pixelId}/events";
        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(request);
        if (response.IsSuccessStatusCode) return (true, null);

        var errorBody = await response.Content.ReadAsStringAsync();
        _logger.LogWarning("Meta CAPI event failed ({StatusCode}): {Error}", response.StatusCode, errorBody);
        return (false, ExtractApiErrorMessage(errorBody));
    }

    // ===================== GA4 Measurement Protocol =====================
    private async Task<(bool Success, string? Error)> SendGa4EventAsync(
        string measurementId, string apiSecret, string eventName, Order order, string? gaClientId, bool debugMode)
    {
        var clientId = string.IsNullOrWhiteSpace(gaClientId) ? Guid.NewGuid().ToString() : gaClientId;

        var body = new
        {
            client_id = clientId,
            events = new[]
            {
                new
                {
                    name = eventName,
                    parameters = new Dictionary<string, object?>
                    {
                        ["transaction_id"] = order.OrderNumber,
                        ["value"] = order.TotalAmount,
                        ["currency"] = "SAR"
                    }
                }
            }
        };

        var baseUrl = debugMode ? "https://www.google-analytics.com/debug/mp/collect" : "https://www.google-analytics.com/mp/collect";
        var url = $"{baseUrl}?measurement_id={Uri.EscapeDataString(measurementId)}&api_secret={Uri.EscapeDataString(apiSecret)}";

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
        };

        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        // مسار /mp/collect بيرجع 204 دايمًا حتى لو المعرفات غلط (سياسة جوجل)، لكن مسار /debug/mp/collect
        // بيرجع validationMessages بتوضح لو فيه مشكلة فعلية — بنستخدمه في الاختبار فقط.
        if (debugMode)
        {
            try
            {
                using var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("validationMessages", out var messages) && messages.GetArrayLength() > 0)
                {
                    var first = messages[0].TryGetProperty("description", out var desc) ? desc.GetString() : "بيانات غير صحيحة";
                    return (false, first);
                }
            }
            catch (JsonException) { /* تجاهل لو الرد مش JSON صالح */ }
        }

        if (response.IsSuccessStatusCode) return (true, null);
        return (false, $"HTTP {(int)response.StatusCode}");
    }

    private static string ExtractApiErrorMessage(string errorJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(errorJson);
            if (doc.RootElement.TryGetProperty("error", out var err) && err.TryGetProperty("message", out var msg))
                return msg.GetString() ?? errorJson;
        }
        catch (JsonException) { }
        return errorJson;
    }

    private static string Sha256Hash(string input)
    {
        var bytes = Encoding.UTF8.GetBytes(input);
        var hash = SHA256.HashData(bytes);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static string NormalizePhoneDigitsOnly(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00")) digits = digits.Substring(2);
        if (digits.StartsWith("0")) digits = "966" + digits.Substring(1);
        return digits;
    }
}