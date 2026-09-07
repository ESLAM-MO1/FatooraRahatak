namespace FatooraRahatak.Application.DTOs.Platform;

public class DashboardSectionDto
{
    public long Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Role { get; set; } = "SuperAdmin";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public List<DashboardLinkDto> Links { get; set; } = new();
}

public class DashboardLinkDto
{
    public string LabelAr { get; set; } = string.Empty;
    public string LabelEn { get; set; } = string.Empty;
    public string Href { get; set; } = string.Empty;
    public string Icon { get; set; } = "settings";
    public string? Perm { get; set; }
}

public class UpsertDashboardSectionDto
{
    public string? Key { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Role { get; set; } = "SuperAdmin";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public List<DashboardLinkDto> Links { get; set; } = new();
}