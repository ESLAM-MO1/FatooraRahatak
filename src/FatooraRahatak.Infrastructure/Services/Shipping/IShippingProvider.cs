using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Services.Shipping;

public class ShippingProviderContext
{
    public string ApiBaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string ApiSecret { get; set; } = string.Empty;
    public string RateConfigJson { get; set; } = string.Empty;

    public string DestinationCity { get; set; } = string.Empty;
    public string DestinationAddress { get; set; } = string.Empty;
    public string RecipientName { get; set; } = string.Empty;
    public string RecipientPhone { get; set; } = string.Empty;
    public decimal Weight { get; set; }
    public decimal? CodAmount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Reference { get; set; } = string.Empty;

    public HttpClient HttpClient { get; set; } = null!;

    public bool HasCredentials => !string.IsNullOrWhiteSpace(ApiKey);
}

public class TrackingEventItem
{
    public string EventCode { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? EventAt { get; set; }
}

public class CreateShipmentProviderResult
{
    public bool Success { get; set; }
    public string Awb { get; set; } = string.Empty;
    public string? LabelUrl { get; set; }
    public string Status { get; set; } = "Pending";
    public List<TrackingEventItem> Events { get; set; } = new();
    public string? Message { get; set; }
    public bool IsSimulation { get; set; }
}

public class TrackingProviderResult
{
    public bool Success { get; set; }
    public string Status { get; set; } = "Unknown";
    public List<TrackingEventItem> Events { get; set; } = new();
    public string? Message { get; set; }
    public bool IsSimulation { get; set; }
}

public interface IShippingProvider
{
    ShippingCompanyCode Code { get; }
    string DisplayName { get; }
    int EstimatedDeliveryDays { get; }
    Task<CreateShipmentProviderResult> CreateShipmentAsync(ShippingProviderContext ctx, CancellationToken ct = default);
    Task<TrackingProviderResult> GetTrackingAsync(ShippingProviderContext ctx, string awb, CancellationToken ct = default);
}
