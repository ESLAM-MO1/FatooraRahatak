using System.Text.Json;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

/// <summary>
/// مزود سمسا إكسبرس (SMSA Express).
/// الاتصال الفعلي يُستخدم عند توفر مفاتيح API، وإلا يقع في الوضع التجريبي.
/// </summary>
public class SmsaShippingProvider : ShippingProviderBase
{
    public override ShippingCompanyCode Code => ShippingCompanyCode.Smsa;
    public override string DisplayName => "سمسا إكسبرس";
    public override int EstimatedDeliveryDays => 2;

    protected override async Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://track.smsaexpress.com").TrimEnd('/');

        var token = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/SecomAPI/api/v1/apicustomers",
            new { username = ctx.ApiKey, password = ctx.ApiSecret },
            ct: ct);

        var bearer = TryGetString(token, "token", out var tokenValue) ? tokenValue : ctx.ApiKey;

        var payload = new
        {
            referenceNumber = ctx.Reference,
            productType = "PDT",
            piecesCount = 1,
            actualWeight = ctx.Weight,
            codAmount = ctx.CodAmount ?? 0,
            dropOffCity = ctx.DestinationCity,
            dropOffContactName = ctx.RecipientName,
            dropOffContactPhone = ctx.RecipientPhone,
            dropOffAddress = ctx.DestinationAddress,
            pickupCity = "الرياض",
            pickupContactName = "المتجر",
            pickupContactPhone = "0111111111",
            pickupAddress = "عنوان المتجر",
            customerEmail = "store@store.com",
            customerPhone = ctx.RecipientPhone,
            shopPhone = ctx.RecipientPhone,
            originCity = "الرياض",
            serviceType = "RTH",
            dateString = DateTime.Now.ToString("dd/MM/yyyy")
        };

        var created = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/SecomAPI/api/v1/shipments/create",
            payload,
            bearerToken: bearer,
            ct: ct);

        if (created.ValueKind == JsonValueKind.Undefined)
            return new CreateShipmentProviderResult { Success = false, Message = "فشل الاتصال بخدمة سمسا" };

        var awb = TryGetString(created, "awb", out var awbValue)
            ? awbValue
            : TryGetString(created, "Awb", out var awbValue2)
                ? awbValue2
                : null;

        if (awb == null && created.TryGetProperty("data", out var data))
            awb = TryGetString(data, "awb", out var dataAwb) ? dataAwb : null;

        return new CreateShipmentProviderResult
        {
            Success = !string.IsNullOrEmpty(awb),
            Awb = awb ?? string.Empty,
            Status = awb == null ? "Pending" : "Registered",
            Message = awb == null ? "لم يتم استلام رقم تتبع من سمسا" : null,
            Events = awb == null
                ? new()
                : new List<TrackingEventItem>
                {
                    new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة في سمسا", EventAt = DateTime.UtcNow }
                }
        };
    }

    protected override async Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://track.smsaexpress.com").TrimEnd('/');

        var token = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/SecomAPI/api/v1/apicustomers",
            new { username = ctx.ApiKey, password = ctx.ApiSecret },
            ct: ct);
        var bearer = TryGetString(token, "token", out var tokenValue) ? tokenValue : ctx.ApiKey;

        var data = await GetJsonAsync(ctx.HttpClient,
            $"{baseUrl}/SecomAPI/api/v1/shipments/{awb}/track",
            bearerToken: bearer,
            ct: ct);

        if (data.ValueKind == JsonValueKind.Undefined)
            return new TrackingProviderResult { Success = false, Message = "فشل جلب التتبع من سمسا" };

        var status = TryGetString(data, "status", out var statusValue) ? statusValue : "Unknown";
        var events = new List<TrackingEventItem>();

        if (data.TryGetProperty("Events", out var evts) || data.TryGetProperty("events", out evts))
        {
            foreach (var e in evts.EnumerateArray())
            {
                events.Add(new TrackingEventItem
                {
                    EventCode = TryGetString(e, "eventCode", out var ec) ? ec : (TryGetString(e, "code", out var c) ? c : ""),
                    Description = TryGetString(e, "description", out var desc) ? desc : (TryGetString(e, "eventDescription", out var ed) ? ed : ""),
                    EventAt = ParseDate(TryGetString(e, "date", out var date) ? date : null)
                });
            }
        }

        return new TrackingProviderResult
        {
            Success = true,
            Status = MapStatus(status),
            Events = events,
            Message = null
        };
    }

    private static string MapStatus(string raw)
    {
        var s = raw.ToLowerInvariant();
        if (s.Contains("deliver")) return "Delivered";
        if (s.Contains("out for delivery")) return "OutForDelivery";
        if (s.Contains("transit") || s.Contains("pickup")) return "InTransit";
        if (s.Contains("fail") || s.Contains("return")) return "Failed";
        return "InTransit";
    }
}
