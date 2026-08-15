using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform.Domains;

public enum SslStatus { Active, Expired, Issuing, Failed }

public class SslCertificate : BaseEntity
{
    public long ManagedDomainId { get; set; }
    public string? CertificateData { get; set; }
    public string? PrivateKey { get; set; }
    public string? Issuer { get; set; }
    public DateTime? NotBefore { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? LastRenewedAt { get; set; }
    public SslStatus Status { get; set; } = SslStatus.Issuing;
    public string? FailureReason { get; set; }
    public ManagedDomain ManagedDomain { get; set; } = null!;
}
