using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform;

/// <summary>
/// ربط متجر المنصة بمنصات البيع الخارجية (سلة، زد، شوبيفاي، نون، أمازون، ...).
/// المزامنة الفعلية للمنتجات والطلبات والمخزون تُفعّل عند إدخال مفاتيح API للمنصة.
/// </summary>
public class PlatformIntegration : BaseEntity
{
    public long StoreId { get; set; }
    public string PlatformCode { get; set; } = string.Empty; // Salla / Zid / Shopify / WooCommerce / Noon / Amazon / Jahez / HungerStation / Alibaba / AliExpress / Temu
    public string? ApiKey { get; set; }
    public string? ApiSecret { get; set; }
    public string? StoreUrl { get; set; }
    public bool IsConnected { get; set; } = false;
    public bool IsEnabled { get; set; } = true;
    public bool SyncProducts { get; set; } = false;
    public bool SyncOrders { get; set; } = false;
    public bool SyncInventory { get; set; } = false;
    public DateTime? LastSyncedAt { get; set; }
    public string? LastSyncMessage { get; set; }

    public Store Store { get; set; } = null!;
}
