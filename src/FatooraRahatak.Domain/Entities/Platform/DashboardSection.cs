using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform;

public class DashboardSection : BaseEntity
{
    public string Key { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public string Role { get; set; } = "SuperAdmin";
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public string ItemsJson { get; set; } = "[]";
}