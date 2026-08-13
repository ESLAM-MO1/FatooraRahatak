using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Platform;

public class ZatcaCredential : BaseEntity
{
    public long StoreId { get; set; }
    public ZatcaCredentialStatus Status { get; set; } = ZatcaCredentialStatus.NotOnboarded;
    public string? VatNumber { get; set; }
    public string? Otp { get; set; }
    public string? ComplianceRequestId { get; set; }
    public string? ComplianceRequestSecret { get; set; }
    public string? ComplianceUuid { get; set; }
    public string? ProductionCsid { get; set; }
    public string? ProductionUuid { get; set; }
    public string? CsidPrivateKey { get; set; }
    public string? CsidCertificate { get; set; }
    public string? CsidSecret { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? CsidExpiresAt { get; set; }
    public string? SolutionName { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? OnboardedAt { get; set; }

    public Store Store { get; set; } = null!;
}
