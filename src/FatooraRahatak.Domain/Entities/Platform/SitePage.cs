using FatooraRahatak.Domain.Common;
namespace FatooraRahatak.Domain.Entities.Platform;

public class SitePage : BaseEntity
{
    public string PageKey { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    // صورة الصفحة حسب اللغة (المزايا): تُعرض بدل/فوق النص حسب اللغة المختارة
    public string? ImageAr { get; set; }
    public string? ImageEn { get; set; }
    public new DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public long? UpdatedByUserId { get; set; }
}
