namespace FatooraRahatak.Application.DTOs.Platform;

public class SiteMenuDto
{
    public long Id { get; set; }
    public string Location { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public long? ParentId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

public class CreateSiteMenuDto
{
    public string Location { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
    public string? Icon { get; set; }
    public long? ParentId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}
