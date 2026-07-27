namespace FatooraRahatak.Application.DTOs.Admin;

public class ManagedDomainDto
{
    public long Id { get; set; }
    public long? StoreId { get; set; }
    public string? StoreName { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string DnsStatus { get; set; } = "Pending";
    public string SslStatus { get; set; } = "Pending";
    public bool IsPrimary { get; set; }
    public string? TargetIp { get; set; }
    public string? TargetCname { get; set; }
    public DateTime? DnsVerifiedAt { get; set; }
    public bool SslEnabled { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SslCertificateDto
{
    public long Id { get; set; }
    public long ManagedDomainId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? ExpiresAt { get; set; }
    public string? FailureReason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DnsRecordDto
{
    public long Id { get; set; }
    public string RecordType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int? Priority { get; set; }
    public int Ttl { get; set; } = 3600;
    public bool IsActive { get; set; } = true;
}

public class RedirectRuleDto
{
    public long Id { get; set; }
    public string SourceDomain { get; set; } = string.Empty;
    public string SourcePath { get; set; } = "/*";
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsPermanent { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
}

public class DomainBlacklistEntryDto
{
    public long Id { get; set; }
    public string DomainPattern { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProfessionalEmailSetupDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string? StoreName { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string EmailProvider { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DomainRegistrationRequestDto
{
    public long Id { get; set; }
    public long? StoreId { get; set; }
    public string? StoreName { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string RegistrarApi { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? ResponseDetails { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DnsCheckResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> ResolvedIps { get; set; } = new();
    public List<string> ResolvedCnames { get; set; } = new();
}

public class DomainLookupResultDto
{
    public string DomainName { get; set; } = string.Empty;
    public bool Available { get; set; }
    public decimal? Price { get; set; }
    public string? Error { get; set; }
}

public class CreateManagedDomainDto
{
    public long? StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string Type { get; set; } = "Custom";
    public string? TargetIp { get; set; }
    public string? TargetCname { get; set; }
}

public class CreateRedirectRuleDto
{
    public string SourceDomain { get; set; } = string.Empty;
    public string SourcePath { get; set; } = "/*";
    public string TargetUrl { get; set; } = string.Empty;
    public bool IsPermanent { get; set; } = true;
}

public class CreateDnsRecordDto
{
    public string RecordType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public int? Priority { get; set; }
    public int Ttl { get; set; } = 3600;
}

public class CreateBlacklistEntryDto
{
    public string DomainPattern { get; set; } = string.Empty;
    public string? Reason { get; set; }
}

public class CreateEmailSetupDto
{
    public long StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string EmailProvider { get; set; } = string.Empty;
}

public class CreateRegistrationRequestDto
{
    public long? StoreId { get; set; }
    public string DomainName { get; set; } = string.Empty;
    public string RegistrarApi { get; set; } = string.Empty;
    public decimal? Price { get; set; }
}
