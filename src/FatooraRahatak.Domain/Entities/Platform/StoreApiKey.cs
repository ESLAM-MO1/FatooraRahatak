using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform;

/// <summary>
/// مفتاح API خاص بمتجر (HasApiAccess). المفتاح السري يظهر مرة واحدة عند الإنشاء فقط.
/// </summary>
public class StoreApiKey : BaseEntity
{
    public long StoreId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public bool IsRevoked { get; set; }
    public DateTime? RevokedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }

    public Store Store { get; set; } = null!;
}
