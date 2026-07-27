using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public class DomainBlacklistEntry : BaseEntity
{
    public string DomainPattern { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public long BlockedByUserId { get; set; }
}
