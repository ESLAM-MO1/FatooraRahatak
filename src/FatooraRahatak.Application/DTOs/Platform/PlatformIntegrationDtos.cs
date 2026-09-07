namespace FatooraRahatak.Application.DTOs.Platform;

public class PlatformIntegrationDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string PlatformCode { get; set; } = string.Empty;
    public string? ApiKeyMasked { get; set; }
    public string? ApiSecretMasked { get; set; }
    public string? StoreUrl { get; set; }
    public bool IsConnected { get; set; }
    public bool IsEnabled { get; set; }
    public bool SyncProducts { get; set; }
    public bool SyncOrders { get; set; }
    public bool SyncInventory { get; set; }
    public DateTime? LastSyncedAt { get; set; }
    public string? LastSyncMessage { get; set; }
}

public class ConnectPlatformIntegrationDto
{
    public string PlatformCode { get; set; } = string.Empty;
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? StoreUrl { get; set; }
    public bool SyncProducts { get; set; }
    public bool SyncOrders { get; set; }
    public bool SyncInventory { get; set; }
}

public class UpdatePlatformIntegrationDto
{
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? StoreUrl { get; set; }
    public bool? IsEnabled { get; set; }
    public bool? SyncProducts { get; set; }
    public bool? SyncOrders { get; set; }
    public bool? SyncInventory { get; set; }
}

public class PlatformIntegrationToggleDto
{
    public bool IsEnabled { get; set; }
}