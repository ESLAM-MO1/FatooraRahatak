using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public class RedirectRule : BaseEntity
{
    public string SourceDomain { get; set; } = string.Empty;
    public string SourcePath { get; set; } = "/*";
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsPermanent { get; set; } = true;
    public bool IsActive { get; set; } = true;
}
