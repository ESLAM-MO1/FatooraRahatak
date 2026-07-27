using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public enum DomainRegistrationStatus { Pending, Completed, Failed }

public class DomainRegistrationRequest : BaseEntity
{
    public long? StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string RegistrarApi { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public DomainRegistrationStatus Status { get; set; } = DomainRegistrationStatus.Pending;
    public string? ResponseDetails { get; set; }
    public Store? Store { get; set; }
}
