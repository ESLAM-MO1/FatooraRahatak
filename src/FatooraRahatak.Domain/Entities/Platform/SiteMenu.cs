using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform;

public class SiteMenu : BaseEntity
{
    public string Location { get; set; } = "header";
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public long? ParentId { get; set; }
    public SiteMenu? Parent { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}