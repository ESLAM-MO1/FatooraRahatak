using System.Text.Json;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

/// <summary>
/// مزود زاجل إكسبرس (Zajil Express).
/// </summary>
public class ZajilShippingProvider : ShippingProviderBase
{
    public override ShippingCompanyCode Code => ShippingCompanyCode.Zajil;
    public override string DisplayName => "زاجل إكسبرس";
    public override int EstimatedDeliveryDays => 3;

    protected override async Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://api.zajil.com").TrimEnd('/');

        var payload = new
        {
            referenceNumber = ctx.Reference,
            awbSource = "API",
            weight = ctx.Weight,
            codAmount = ctx.CodAmount ?? 0,
            currency = ctx.Currency,
            destinationCity = ctx.DestinationCity,
            destinationAddress = ctx.DestinationAddress,
            consigneeName = ctx.RecipientName,
            consigneePhone = ctx.RecipientPhone,
            originCity = "الرياض",
            serviceType = "COD"
        };

        var created = await PostJsonAsync(ctx.HttpClient,
            $"{baseUrl}/api/shipments",
            payload,
            bearerToken: ctx.ApiKey,
            ct: ct);

        if (created.ValueKind == JsonValueKind.Undefined)
            return new CreateShipmentProviderResult { Success = false, Message = "فشل الاتصال بخدمة زاجل" };

        var awb = TryGetString(created, "awb", out var awb1) ? awb1
            : TryGetString(created, "AwbNumber", out var awb2) ? awb2
            : TryGetString(created, "barcode", out var awb3) ? awb3
            : null;

        return new CreateShipmentProviderResult
        {
            Success = !string.IsNullOrEmpty(awb),
            Awb = awb ?? string.Empty,
            Status = awb == null ? "Pending" : "Registered",
            Message = awb == null ? "لم يتم استلام رقم تتبع من زاجل" : null,
            Events = awb == null
                ? new()
                : new List<TrackingEventItem>
                {
                    new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة في زاجل", EventAt = DateTime.UtcNow }
                }
        };
    }

    protected override async Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct)
    {
        var baseUrl = (ctx.ApiBaseUrl ?? "https://api.zajil.com").TrimEnd('/');

        var data = await GetJsonAsync(ctx.HttpClient,
            $"{baseUrl}/api/shipments/{awb}/tracking",
            bearerToken: ctx.ApiKey,
            ct: ct);

        if (data.ValueKind == JsonValueKind.Undefined)
            return new TrackingProviderResult { Success = false, Message = "فشل جلب التتبع من زاجل" };

        var events = new List<TrackingEventItem>();
        var status = TryGetString(data, "status", out var st) ? st : "Unknown";

        if (data.TryGetProperty("events", out var evts))
        {
            foreach (var e in evts.EnumerateArray())
            {
                events.Add(new TrackingEventItem
                {
                    EventCode = TryGetString(e, "code", out var c) ? c : "",
                    Description = TryGetString(e, "description", out var d) ? d : "",
                    EventAt = ParseDate(TryGetString(e, "date", out var dt) ? dt : null) ?? ParseDate(TryGetString(e, "eventDateTime", out var edt) ? edt : null)
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
