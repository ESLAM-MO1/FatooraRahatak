using FatooraRahatak.Domain.Enums;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

public abstract class ShippingProviderBase : IShippingProvider
{
    public abstract ShippingCompanyCode Code { get; }
    public abstract string DisplayName { get; }
    public abstract int EstimatedDeliveryDays { get; }

    protected virtual string AwbPrefix => Code.ToString().ToUpperInvariant();

    public async Task<CreateShipmentProviderResult> CreateShipmentAsync(ShippingProviderContext ctx, CancellationToken ct = default)
    {
        if (!ctx.HasCredentials)
            return SimulateCreate(ctx);

        try
        {
            var result = await CreateShipmentWithApiAsync(ctx, ct);
            return result.Success ? result : SimulateCreate(ctx, result.Message);
        }
        catch (Exception ex)
        {
            return SimulateCreate(ctx, ex.Message);
        }
    }

    public async Task<TrackingProviderResult> GetTrackingAsync(ShippingProviderContext ctx, string awb, CancellationToken ct = default)
    {
        if (!ctx.HasCredentials)
            return SimulateTracking(awb);

        try
        {
            var result = await GetTrackingWithApiAsync(ctx, awb, ct);
            return result.Success ? result : SimulateTracking(awb, result.Message);
        }
        catch (Exception ex)
        {
            return SimulateTracking(awb, ex.Message);
        }
    }

    protected abstract Task<CreateShipmentProviderResult> CreateShipmentWithApiAsync(ShippingProviderContext ctx, CancellationToken ct);
    protected abstract Task<TrackingProviderResult> GetTrackingWithApiAsync(ShippingProviderContext ctx, string awb, CancellationToken ct);

    protected virtual CreateShipmentProviderResult SimulateCreate(ShippingProviderContext ctx, string? message = null)
    {
        var awb = $"{AwbPrefix}{Random.Shared.Next(100000000, 999999999)}";
        return new CreateShipmentProviderResult
        {
            Success = true,
            Awb = awb,
            Status = "Registered",
            IsSimulation = true,
            Message = message != null
                ? $"وضع تجريبي (فشل الاتصال بالشركة): {message}"
                : "وضع تجريبي: لم تُضبط مفاتيح API بعد — تم إنشاء رقم تتبع افتراضي",
            Events = new List<TrackingEventItem>
            {
                new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة واستلامها من شركة الشحن", EventAt = DateTime.UtcNow }
            }
        };
    }

    protected virtual TrackingProviderResult SimulateTracking(string awb, string? message = null)
    {
        return new TrackingProviderResult
        {
            Success = true,
            Status = "InTransit",
            IsSimulation = true,
            Message = message != null
                ? $"وضع تجريبي (فشل الاتصال بالشركة): {message}"
                : "وضع تجريبي: التتبع افتراضي لعدم وجود مفاتيح API",
            Events = new List<TrackingEventItem>
            {
                new() { EventCode = "CREATED", Description = "تم إنشاء الشحنة", EventAt = DateTime.UtcNow.AddDays(-2) },
                new() { EventCode = "PICKED", Description = "تم الاستلام من المرسل", EventAt = DateTime.UtcNow.AddDays(-1) },
                new() { EventCode = "TRANSIT", Description = "الشحنة في الطريق إلى وجهتها", EventAt = DateTime.UtcNow }
            }
        };
    }

    protected async Task<JsonElement> PostJsonAsync(HttpClient client, string url, object payload, string? bearerToken = null, string? basicUser = null, string? basicPass = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(bearerToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
        if (!string.IsNullOrWhiteSpace(basicUser))
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{basicUser}:{basicPass}")));

        var response = await client.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return default;

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    protected async Task<JsonElement> GetJsonAsync(HttpClient client, string url, string? bearerToken = null, CancellationToken ct = default)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        if (!string.IsNullOrWhiteSpace(bearerToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);

        var response = await client.SendAsync(request, ct);
        var json = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            return default;

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    protected static bool TryGetString(JsonElement el, string name, out string value)
    {
        if (el.ValueKind == JsonValueKind.Object && el.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String)
        {
            value = v.GetString() ?? string.Empty;
            return true;
        }
        value = string.Empty;
        return false;
    }

    protected static DateTime? ParseDate(string? s)
        => DateTime.TryParse(s, out var d) ? d : null;
}
