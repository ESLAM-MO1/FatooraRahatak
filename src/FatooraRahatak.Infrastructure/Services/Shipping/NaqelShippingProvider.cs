using System.Text.Json;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

/// <summary>
/// مزود ناقل إكسبرس (Naqel Express).
/// </summary>
public class NaqelShippingProvider : ShippingProviderBase
{
    public override ShippingCompanyCode Code => ShippingCompanyCode.Naqel;
    public override string DisplayName => "ناقل إكسبرس";
    public override int EstimatedDeliveryDays => 4;

    protected override async Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://api.naqelksa.com/api/v1").TrimEnd('/');

        var payload = new
        {
            referenceNumber = ctx.Reference,
            consignee = new
            {
                name = ctx.RecipientName,
                phone = ctx.RecipientPhone,
                address = ctx.DestinationAddress,
                city = ctx.DestinationCity
            },
            weight = ctx.Weight,
            codAmount = ctx.CodAmount ?? 0,
            currency = ctx.Currency,
            productType = "DOMESTIC",
            pickupCity = "الرياض"
        };

        var created = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/shipments",
            payload,
            bearerToken: ctx.ApiKey,
            ct: ct);

        if (created.ValueKind == JsonValueKind.Undefined)
            return new CreateShipmentProviderResult { Success = false, Message = "فشل الاتصال بخدمة ناقل" };

        var awb = TryGetString(created, "awb", out var awb1) ? awb1
            : TryGetString(created, "awbNumber", out var awb2) ? awb2
            : TryGetString(created, "trackingNumber", out var awb3) ? awb3
            : null;

        return new CreateShipmentProviderResult
        {
            Success = !string.IsNullOrEmpty(awb),
            Awb = awb ?? string.Empty,
            Status = awb == null ? "Pending" : "Registered",
            Message = awb == null ? "لم يتم استلام رقم تتبع من ناقل" : null,
            Events = awb == null
                ? new()
                : new List<TrackingEventItem>
                {
                    new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة في ناقل", EventAt = DateTime.UtcNow }
                }
        };
    }

    protected override async Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://api.naqelksa.com/api/v1").TrimEnd('/');

        var data = await GetJsonAsync(ctx.HttpClient,
            $"{baseUrl}/shipments/{awb}/tracking",
            bearerToken: ctx.ApiKey,
            ct: ct);

        if (data.ValueKind == JsonValueKind.Undefined)
            return new TrackingProviderResult { Success = false, Message = "فشل جلب التتبع من ناقل" };

        var events = new List<TrackingEventItem>();
        var status = TryGetString(data, "status", out var st) ? st : "Unknown";

        if (data.TryGetProperty("trackingEvents", out var evts) || data.TryGetProperty("events", out evts))
        {
            foreach (var e in evts.EnumerateArray())
            {
                events.Add(new TrackingEventItem
                {
                    EventCode = TryGetString(e, "eventCode", out var ec) ? ec : (TryGetString(e, "code", out var c) ? c : ""),
                    Description = TryGetString(e, "description", out var d) ? d : "",
                    EventAt = ParseDate(TryGetString(e, "eventDateTime", out var edt) ? edt : null) ?? ParseDate(TryGetString(e, "date", out var dt) ? dt : null)
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
        if (s.Contains("transit") || s.Contains("pickup") || s.Contains("shipped")) return "InTransit";
        if (s.Contains("fail") || s.Contains("return")) return "Failed";
        return "InTransit";
    }
}
