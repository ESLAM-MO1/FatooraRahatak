using FatooraRahatak.Application.DTOs.Admin;

namespace FatooraRahatak.Application.Interfaces;

public interface IDomainService
{
    Task<List<ManagedDomainDto>> GetAllDomainsAsync();
    Task<ManagedDomainDto> CreateDomainAsync(CreateManagedDomainDto dto);
    Task<ManagedDomainDto> UpdateDomainStatusAsync(long id, string status);
    Task<DnsCheckResultDto> VerifyDnsAsync(string domainName, string? expectedIp, string? expectedCname);
    Task AutoCreateSubdomainAsync(long storeId, string slug);
    Task<List<CustomDomainDto>> GetCustomDomainsAsync();
    Task<CustomDomainDto> BindCustomDomainAsync(long storeId, string domainName);
    Task<CustomDomainDto> SetCustomDomainDnsVerifiedAsync(long storeId);
    Task<bool> RemoveCustomDomainAsync(long storeId);
    Task<List<SslCertificateDto>> GetAllSslCertificatesAsync();
    Task<SslCertificateDto> RequestSslAsync(long domainId);
    Task RenewExpiringSslAsync();
    Task<List<DnsRecordDto>> GetDnsRecordsAsync();
    Task<DnsRecordDto> CreateDnsRecordAsync(CreateDnsRecordDto dto);
    Task UpdateDnsRecordAsync(long id, CreateDnsRecordDto dto);
    Task DeleteDnsRecordAsync(long id);
    Task<List<RedirectRuleDto>> GetRedirectRulesAsync();
    Task<RedirectRuleDto> CreateRedirectRuleAsync(CreateRedirectRuleDto dto);
    Task UpdateRedirectRuleAsync(long id, CreateRedirectRuleDto dto);
    Task DeleteRedirectRuleAsync(long id);
    Task<DomainLookupResultDto> LookupDomainAsync(string domainName);
    Task<List<DomainRegistrationRequestDto>> GetRegistrationRequestsAsync();
    Task<DomainRegistrationRequestDto> CreateRegistrationRequestAsync(CreateRegistrationRequestDto dto);
    Task<List<ProfessionalEmailSetupDto>> GetEmailSetupsAsync();
    Task<ProfessionalEmailSetupDto> CreateEmailSetupAsync(CreateEmailSetupDto dto);
    Task ToggleEmailSetupAsync(long id);
    Task DeleteEmailSetupAsync(long id);
    Task<List<DomainBlacklistEntryDto>> GetBlacklistAsync();
    Task<DomainBlacklistEntryDto> AddToBlacklistAsync(CreateBlacklistEntryDto dto, long adminUserId);
    Task RemoveFromBlacklistAsync(long id);
    Task<bool> IsDomainBlacklistedAsync(string domainName);
    Task<List<ManagedDomainDto>> GetDomainStatusReportAsync(string? filter);
    Task SeedSubdomainsForExistingStoresAsync();
}
