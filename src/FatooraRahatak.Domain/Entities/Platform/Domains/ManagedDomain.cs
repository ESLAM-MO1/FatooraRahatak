using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public enum ManagedDomainType { Subdomain, Custom }
public enum ManagedDomainStatus { Active, Inactive, PendingDns, Failed }

public class ManagedDomain : BaseEntity
{
    public long? StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public ManagedDomainType Type { get; set; }
    public ManagedDomainStatus Status { get; set; } = ManagedDomainStatus.PendingDns;
    public string? TargetIp { get; set; }
    public string? TargetCname { get; set; }
    public DateTime? DnsVerifiedAt { get; set; }
    public bool SslEnabled { get; set; }
    public Store? Store { get; set; }
    public ICollection<SslCertificate> SslCertificates { get; set; } = new List<SslCertificate>();
}
