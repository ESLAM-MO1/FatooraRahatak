namespace FatooraRahatak.Application.DTOs.ApiKeys;

public class CreateStoreApiKeyDto
{
    public string Name { get; set; } = string.Empty;
}

/// <summary>المفتاح السري يُرجع مرة واحدة عند الإنشاء فقط، وبعده يظهر مُخفيًا (آخر 4 أحرف).</summary>
public class StoreApiKeyDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string SecretKeyMasked { get; set; } = string.Empty;
    public string? SecretKey { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime? LastUsedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
