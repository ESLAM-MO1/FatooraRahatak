using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public class ProfessionalEmailSetup : BaseEntity
{
    public long? StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string MailboxName { get; set; } = string.Empty;
    public string EmailAddress { get; set; } = string.Empty;
    public string EmailProvider { get; set; } = string.Empty;
    public string? MxRecordsJson { get; set; }
    public bool IsActive { get; set; }
    public Store? Store { get; set; }
}
