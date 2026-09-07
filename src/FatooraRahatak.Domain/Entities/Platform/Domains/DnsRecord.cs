using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public class DnsRecord : BaseEntity
{
    public string RecordType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int? Priority { get; set; }
    public int Ttl { get; set; } = 3600;
    public bool IsActive { get; set; } = true;
}
