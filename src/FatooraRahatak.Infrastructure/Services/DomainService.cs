using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform.Domains;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;

namespace FatooraRahatak.Infrastructure.Services;

public class DomainService : IDomainService
{
    private readonly AppDbContext _context;
    private const string PlatformDomain = "fatorahr.com";
    private const string DefaultTargetIp = "185.199.108.153";
    private const string DefaultTargetCname = "fatorahr.com";

    public DomainService(AppDbContext context)
    {
        _context = context;
    }

    #region Managed Domains

    public async Task<List<ManagedDomainDto>> GetAllDomainsAsync()
    {
        return await _context.Set<ManagedDomain>()
            .Include(d => d.Store)
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new ManagedDomainDto
            {
                Id = d.Id,
                StoreId = d.StoreId,
                StoreName = d.Store != null ? d.Store.StoreName : null,
                DomainName = d.DomainName,
                Type = d.Type.ToString(),
                Status = d.Status.ToString(),
                DnsStatus = d.DnsVerifiedAt != null ? "Verified" : "Pending",
                SslStatus = d.SslCertificates.OrderByDescending(s => s.CreatedAt).Select(s => s.Status.ToString()).FirstOrDefault() ?? "Pending",
                IsPrimary = d.Type == ManagedDomainType.Subdomain,
                TargetIp = d.TargetIp,
                TargetCname = d.TargetCname,
                DnsVerifiedAt = d.DnsVerifiedAt,
                SslEnabled = d.SslEnabled,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ManagedDomainDto> CreateDomainAsync(CreateManagedDomainDto dto)
    {
        var blacklisted = await _context.Set<DomainBlacklistEntry>()
            .AnyAsync(b => dto.DomainName.Contains(b.DomainPattern));
        if (blacklisted)
            throw new InvalidOperationException("هذا الدومين موجود في القائمة السوداء ولا يمكن ربطه");

        var existing = await _context.Set<ManagedDomain>()
            .AnyAsync(d => d.DomainName == dto.DomainName);
        if (existing)
            throw new InvalidOperationException("هذا الدومين مضاف مسبقًا");

        var entity = new ManagedDomain
        {
            StoreId = dto.StoreId,
            DomainName = dto.DomainName,
            Type = dto.Type == "Subdomain" ? ManagedDomainType.Subdomain : ManagedDomainType.Custom,
            Status = ManagedDomainStatus.PendingDns,
            TargetIp = dto.TargetIp ?? DefaultTargetIp,
            TargetCname = dto.TargetCname ?? DefaultTargetCname,
            SslEnabled = false
        };

        _context.Set<ManagedDomain>().Add(entity);
        await _context.SaveChangesAsync();

        return new ManagedDomainDto
        {
            Id = entity.Id,
            StoreId = entity.StoreId,
            DomainName = entity.DomainName,
            Type = entity.Type.ToString(),
            Status = entity.Status.ToString(),
            DnsStatus = "Pending",
            SslStatus = "Pending",
            IsPrimary = entity.Type == ManagedDomainType.Subdomain,
            TargetIp = entity.TargetIp,
            TargetCname = entity.TargetCname,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<ManagedDomainDto> UpdateDomainStatusAsync(long id, string status)
    {
        var entity = await _context.Set<ManagedDomain>().FindAsync(id)
            ?? throw new InvalidOperationException("الدومين غير موجود");

        entity.Status = status switch
        {
            "Active" => ManagedDomainStatus.Active,
            "Inactive" => ManagedDomainStatus.Inactive,
            "PendingDns" => ManagedDomainStatus.PendingDns,
            "Failed" => ManagedDomainStatus.Failed,
            _ => entity.Status
        };

        if (status == "Active")
            entity.DnsVerifiedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return new ManagedDomainDto { Id = entity.Id, DomainName = entity.DomainName, Status = entity.Status.ToString(), DnsStatus = "Verified", SslStatus = "Pending", IsPrimary = entity.Type == ManagedDomainType.Subdomain };
    }

    #endregion

    #region Custom Domains (Stores.CustomDomain)

    public async Task<List<CustomDomainDto>> GetCustomDomainsAsync()
    {
        return await _context.Stores
            .Where(s => s.CustomDomain != null && s.CustomDomain != "")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new CustomDomainDto
            {
                StoreId = s.Id,
                StoreName = s.StoreName,
                DomainName = s.CustomDomain!,
                Status = s.CustomDomainStatus.ToString(),
                DnsVerified = s.CustomDomainStatus == CustomDomainStatus.Active,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<CustomDomainDto> BindCustomDomainAsync(long storeId, string domainName)
    {
        var store = await _context.Stores.FindAsync(storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var domain = (domainName ?? "").Trim().ToLowerInvariant();
        domain = domain.Replace("https://", "").Replace("http://", "").TrimEnd('/');
        if (string.IsNullOrWhiteSpace(domain))
            throw new InvalidOperationException("يجب إدخال اسم النطاق");

        var blacklisted = await _context.Set<DomainBlacklistEntry>()
            .AnyAsync(b => domain.Contains(b.DomainPattern));
        if (blacklisted)
            throw new InvalidOperationException("هذا الدومين موجود في القائمة السوداء");

        var exists = await _context.Stores
            .AnyAsync(s => s.Id != storeId && s.CustomDomain != null && s.CustomDomain.ToLower() == domain);
        if (exists)
            throw new InvalidOperationException("هذا الدومين مستخدم بالفعل من متجر آخر");

        store.CustomDomain = domain;
        store.CustomDomainStatus = CustomDomainStatus.Pending;
        await _context.SaveChangesAsync();

        return new CustomDomainDto
        {
            StoreId = store.Id,
            StoreName = store.StoreName,
            DomainName = store.CustomDomain!,
            Status = store.CustomDomainStatus.ToString(),
            DnsVerified = false,
            CreatedAt = store.CreatedAt
        };
    }

    public async Task<CustomDomainDto> SetCustomDomainDnsVerifiedAsync(long storeId)
    {
        var store = await _context.Stores.FindAsync(storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");
        if (string.IsNullOrWhiteSpace(store.CustomDomain))
            throw new InvalidOperationException("لا يوجد دومين مخصص لهذا المتجر");

        store.CustomDomainStatus = CustomDomainStatus.Active;
        await _context.SaveChangesAsync();

        return new CustomDomainDto
        {
            StoreId = store.Id,
            StoreName = store.StoreName,
            DomainName = store.CustomDomain,
            Status = store.CustomDomainStatus.ToString(),
            DnsVerified = true,
            CreatedAt = store.CreatedAt
        };
    }

    public async Task<bool> RemoveCustomDomainAsync(long storeId)
    {
        var store = await _context.Stores.FindAsync(storeId);
        if (store == null) return false;

        store.CustomDomain = null;
        store.CustomDomainStatus = CustomDomainStatus.None;
        await _context.SaveChangesAsync();
        return true;
    }

    #endregion

    #region SSL

    public async Task<List<SslCertificateDto>> GetAllSslCertificatesAsync()
    {
        return await _context.Set<SslCertificate>()
            .Include(s => s.ManagedDomain)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SslCertificateDto
            {
                Id = s.Id,
                ManagedDomainId = s.ManagedDomainId,
                DomainName = s.ManagedDomain.DomainName,
                Issuer = s.Issuer,
                ExpiresAt = s.ExpiresAt,
                LastRenewedAt = s.LastRenewedAt,
                Status = s.Status.ToString(),
                FailureReason = s.FailureReason,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SslCertificateDto> RequestSslAsync(long domainId)
    {
        var domain = await _context.Set<ManagedDomain>().FindAsync(domainId)
            ?? throw new InvalidOperationException("الدومين غير موجود");

        // إنهاء أي شهادة سابقة معلّقة لنفس الدومين
        var pending = await _context.Set<SslCertificate>()
            .Where(s => s.ManagedDomainId == domainId && s.Status != SslStatus.Active)
            .ToListAsync();
        _context.Set<SslCertificate>().RemoveRange(pending);

        var (certPem, keyPem, issuer, notBefore, expiresAt) = GenerateSelfSignedCertificate(domain.DomainName);

        var ssl = new SslCertificate
        {
            ManagedDomainId = domainId,
            CertificateData = certPem,
            PrivateKey = keyPem,
            Issuer = issuer,
            NotBefore = notBefore,
            ExpiresAt = expiresAt,
            LastRenewedAt = DateTime.UtcNow,
            Status = SslStatus.Active
        };
        _context.Set<SslCertificate>().Add(ssl);
        domain.SslEnabled = true;
        await _context.SaveChangesAsync();

        return new SslCertificateDto
        {
            Id = ssl.Id,
            ManagedDomainId = domainId,
            DomainName = domain.DomainName,
            Issuer = ssl.Issuer,
            ExpiresAt = ssl.ExpiresAt,
            LastRenewedAt = ssl.LastRenewedAt,
            Status = ssl.Status.ToString(),
            CreatedAt = ssl.CreatedAt
        };
    }

    public async Task RenewExpiringSslAsync()
    {
        var expiringSoon = await _context.Set<SslCertificate>()
            .Include(s => s.ManagedDomain)
            .Where(s => s.Status == SslStatus.Active && s.ExpiresAt != null && s.ExpiresAt < DateTime.UtcNow.AddDays(14))
            .ToListAsync();

        foreach (var cert in expiringSoon)
        {
            try
            {
                var (certPem, keyPem, issuer, notBefore, expiresAt) = GenerateSelfSignedCertificate(cert.ManagedDomain.DomainName);
                cert.CertificateData = certPem;
                cert.PrivateKey = keyPem;
                cert.Issuer = issuer;
                cert.NotBefore = notBefore;
                cert.ExpiresAt = expiresAt;
                cert.LastRenewedAt = DateTime.UtcNow;
                cert.Status = SslStatus.Active;
                cert.FailureReason = null;
            }
            catch (Exception ex)
            {
                cert.Status = SslStatus.Failed;
                cert.FailureReason = ex.Message;
            }
        }

        await _context.SaveChangesAsync();
    }

    private static (string CertPem, string KeyPem, string Issuer, DateTime NotBefore, DateTime ExpiresAt) GenerateSelfSignedCertificate(string domainName)
    {
        using var rsa = RSA.Create(2048);
        var request = new CertificateRequest($"CN={domainName}", rsa, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);

        var san = new SubjectAlternativeNameBuilder();
        san.AddDnsName(domainName);
        if (domainName.StartsWith("www.", StringComparison.OrdinalIgnoreCase))
            san.AddDnsName(domainName[4..]);
        request.CertificateExtensions.Add(san.Build());

        var notBefore = DateTime.UtcNow.AddDays(-1);
        var expiresAt = DateTime.UtcNow.AddDays(90);
        var cert = request.CreateSelfSigned(notBefore, expiresAt);

        var certPem = "-----BEGIN CERTIFICATE-----\n" +
            Convert.ToBase64String(cert.RawData, Base64FormattingOptions.InsertLineBreaks) +
            "\n-----END CERTIFICATE-----";
        var keyPem = rsa.ExportPkcs8PrivateKeyPem();

        return (certPem, keyPem, "FatooraRahatak Local CA (self-signed)", notBefore, expiresAt);
    }

    #endregion

    #region DNS Records

    public async Task<List<DnsRecordDto>> GetDnsRecordsAsync()
    {
        return await _context.Set<DnsRecord>()
            .OrderBy(r => r.RecordType)
            .ThenBy(r => r.Name)
            .Select(r => new DnsRecordDto
            {
                Id = r.Id,
                RecordType = r.RecordType,
                Name = r.Name,
                Value = r.Value,
                Priority = r.Priority,
                Ttl = r.Ttl,
                IsActive = r.IsActive,
                Status = r.IsActive ? "Active" : "Inactive"
            })
            .ToListAsync();
    }

    public async Task<DnsRecordDto> CreateDnsRecordAsync(CreateDnsRecordDto dto)
    {
        var entity = new DnsRecord
        {
            RecordType = dto.RecordType,
            Name = dto.Name,
            Value = dto.Value,
            Priority = dto.Priority,
            Ttl = dto.Ttl,
            IsActive = true
        };
        _context.Set<DnsRecord>().Add(entity);
        await _context.SaveChangesAsync();

        return new DnsRecordDto
        {
            Id = entity.Id,
            RecordType = entity.RecordType,
            Name = entity.Name,
            Value = entity.Value,
            Priority = entity.Priority,
            Ttl = entity.Ttl,
            IsActive = entity.IsActive,
            Status = "Active"
        };
    }

    public async Task UpdateDnsRecordAsync(long id, CreateDnsRecordDto dto)
    {
        var entity = await _context.Set<DnsRecord>().FindAsync(id)
            ?? throw new InvalidOperationException("سجل DNS غير موجود");
        entity.RecordType = dto.RecordType;
        entity.Name = dto.Name;
        entity.Value = dto.Value;
        entity.Priority = dto.Priority;
        entity.Ttl = dto.Ttl;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteDnsRecordAsync(long id)
    {
        var entity = await _context.Set<DnsRecord>().FindAsync(id)
            ?? throw new InvalidOperationException("سجل DNS غير موجود");
        entity.IsActive = false;
        await _context.SaveChangesAsync();
    }

    public async Task<DnsCheckResultDto> VerifyDnsAsync(string domainName, string? expectedIp, string? expectedCname)
    {
        var result = new DnsCheckResultDto { Domain = domainName };

        try
        {
            var hostEntry = await System.Net.Dns.GetHostEntryAsync(domainName);
            result.ResolvedIps = hostEntry.AddressList.Select(a => a.ToString()).ToList();
            result.ResolvedCnames = hostEntry.Aliases.ToList();

            if (!string.IsNullOrEmpty(expectedIp))
            {
                result.ExpectedIp = expectedIp;
                result.Matched = result.ResolvedIps.Any(ip => string.Equals(ip, expectedIp, StringComparison.OrdinalIgnoreCase));
                result.Success = result.Matched;
                result.Message = result.Matched
                    ? "✅ تطابق سجل A بنجاح"
                    : $"❌ سجل A غير متطابق. المتوقع: {expectedIp}، الحالي: {string.Join(", ", result.ResolvedIps)}";
            }
            else if (!string.IsNullOrEmpty(expectedCname))
            {
                result.ExpectedCname = expectedCname;
                var target = expectedCname.Replace("http://", "").Replace("https://", "").Trim('/');
                result.Matched = result.ResolvedCnames.Any(c => c.Contains(target, StringComparison.OrdinalIgnoreCase));
                result.Success = result.Matched;
                result.Message = result.Matched ? "✅ تطابق سجل CNAME بنجاح" : "❌ سجل CNAME غير متطابق";
            }
            else
            {
                result.Matched = result.ResolvedIps.Count > 0;
                result.Success = result.Matched;
                result.Message = result.Matched ? "✅ تم حل اسم الدومين بنجاح" : "❌ لم يتم العثور على أي سجلات DNS";
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Matched = false;
            result.Message = $"❌ فشل فحص DNS: {ex.Message}";
        }

        return result;
    }

    #endregion

    #region Redirect Rules

    public async Task<List<RedirectRuleDto>> GetRedirectRulesAsync()
    {
        return await _context.Set<RedirectRule>()
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new RedirectRuleDto
            {
                Id = r.Id,
                SourceDomain = r.SourceDomain,
                SourcePath = r.SourcePath,
                TargetUrl = r.TargetUrl,
                RedirectType = r.IsPermanent ? 301 : 302,
                IsActive = r.IsActive,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<RedirectRuleDto> CreateRedirectRuleAsync(CreateRedirectRuleDto dto)
    {
        var entity = new RedirectRule
        {
            SourceDomain = dto.SourceDomain,
            SourcePath = dto.SourcePath,
            TargetUrl = dto.TargetUrl,
            IsPermanent = dto.RedirectType == 301,
            IsActive = dto.IsActive
        };
        _context.Set<RedirectRule>().Add(entity);
        await _context.SaveChangesAsync();

        return new RedirectRuleDto
        {
            Id = entity.Id,
            SourceDomain = entity.SourceDomain,
            SourcePath = entity.SourcePath,
            TargetUrl = entity.TargetUrl,
            RedirectType = entity.IsPermanent ? 301 : 302,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task UpdateRedirectRuleAsync(long id, CreateRedirectRuleDto dto)
    {
        var entity = await _context.Set<RedirectRule>().FindAsync(id)
            ?? throw new InvalidOperationException("قاعدة التحويل غير موجودة");
        entity.SourceDomain = dto.SourceDomain;
        entity.SourcePath = dto.SourcePath;
        entity.TargetUrl = dto.TargetUrl;
        entity.IsPermanent = dto.RedirectType == 301;
        entity.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteRedirectRuleAsync(long id)
    {
        var entity = await _context.Set<RedirectRule>().FindAsync(id)
            ?? throw new InvalidOperationException("قاعدة التحويل غير موجودة");
        entity.IsActive = false;
        await _context.SaveChangesAsync();
    }

    public async Task<DomainLookupResultDto> LookupDomainAsync(string domainName)
    {
        var result = new DomainLookupResultDto { DomainName = domainName };
        try
        {
            await System.Net.Dns.GetHostEntryAsync(domainName);
            result.Available = false;
            result.Error = "الدومين مسجل بالفعل";
        }
        catch
        {
            result.Available = true;
            result.Price = 39.99m;
        }
        return result;
    }

    #endregion

    #region Domain Registration

    public async Task<List<DomainRegistrationRequestDto>> GetRegistrationRequestsAsync()
    {
        return await _context.Set<DomainRegistrationRequest>()
            .Include(r => r.Store)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new DomainRegistrationRequestDto
            {
                Id = r.Id,
                StoreId = r.StoreId,
                StoreName = r.Store != null ? r.Store.StoreName : null,
                DomainName = r.DomainName,
                RegistrantName = r.RegistrantName,
                RegistrantEmail = r.RegistrantEmail,
                RegistrarApi = r.RegistrarApi,
                Price = r.Price,
                Status = r.Status.ToString(),
                ResponseDetails = r.ResponseDetails,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<DomainRegistrationRequestDto> CreateRegistrationRequestAsync(CreateRegistrationRequestDto dto)
    {
        var blacklisted = await _context.Set<DomainBlacklistEntry>()
            .AnyAsync(b => dto.DomainName.Contains(b.DomainPattern));
        if (blacklisted)
            throw new InvalidOperationException("هذا الدومين موجود في القائمة السوداء");

        var entity = new DomainRegistrationRequest
        {
            StoreId = dto.StoreId,
            DomainName = dto.DomainName,
            RegistrantName = dto.RegistrantName,
            RegistrantEmail = dto.RegistrantEmail,
            RegistrarApi = dto.RegistrarApi,
            Price = dto.Price,
            Status = DomainRegistrationStatus.Pending
        };
        _context.Set<DomainRegistrationRequest>().Add(entity);
        await _context.SaveChangesAsync();

        return new DomainRegistrationRequestDto
        {
            Id = entity.Id,
            StoreId = entity.StoreId,
            DomainName = entity.DomainName,
            RegistrantName = entity.RegistrantName,
            RegistrantEmail = entity.RegistrantEmail,
            RegistrarApi = entity.RegistrarApi,
            Price = entity.Price,
            Status = entity.Status.ToString(),
            CreatedAt = entity.CreatedAt
        };
    }

    #endregion

    #region Professional Email

    public async Task<List<ProfessionalEmailSetupDto>> GetEmailSetupsAsync()
    {
        return await _context.Set<ProfessionalEmailSetup>()
            .Include(e => e.Store)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new ProfessionalEmailSetupDto
            {
                Id = e.Id,
                StoreId = e.StoreId,
                StoreName = e.Store != null ? e.Store.StoreName : null,
                DomainName = e.DomainName,
                MailboxName = e.MailboxName,
                EmailAddress = e.EmailAddress,
                Provider = e.EmailProvider,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ProfessionalEmailSetupDto> CreateEmailSetupAsync(CreateEmailSetupDto dto)
    {
        var entity = new ProfessionalEmailSetup
        {
            StoreId = dto.StoreId,
            DomainName = dto.DomainName,
            MailboxName = dto.MailboxName,
            EmailAddress = string.IsNullOrWhiteSpace(dto.EmailAddress)
                ? (string.IsNullOrWhiteSpace(dto.MailboxName) ? dto.DomainName : $"{dto.MailboxName}@{dto.DomainName}")
                : dto.EmailAddress,
            EmailProvider = dto.Provider,
            IsActive = true
        };
        _context.Set<ProfessionalEmailSetup>().Add(entity);
        await _context.SaveChangesAsync();

        return new ProfessionalEmailSetupDto
        {
            Id = entity.Id,
            StoreId = entity.StoreId,
            DomainName = entity.DomainName,
            MailboxName = entity.MailboxName,
            EmailAddress = entity.EmailAddress,
            Provider = entity.EmailProvider,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task ToggleEmailSetupAsync(long id)
    {
        var entity = await _context.Set<ProfessionalEmailSetup>().FindAsync(id)
            ?? throw new InvalidOperationException("الإعداد غير موجود");
        entity.IsActive = !entity.IsActive;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEmailSetupAsync(long id)
    {
        var entity = await _context.Set<ProfessionalEmailSetup>().FindAsync(id)
            ?? throw new InvalidOperationException("الإعداد غير موجود");
        _context.Set<ProfessionalEmailSetup>().Remove(entity);
        await _context.SaveChangesAsync();
    }

    #endregion

    #region Blacklist

    public async Task<List<DomainBlacklistEntryDto>> GetBlacklistAsync()
    {
        return await _context.Set<DomainBlacklistEntry>()
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new DomainBlacklistEntryDto
            {
                Id = b.Id,
                DomainPattern = b.DomainPattern,
                Reason = b.Reason,
                AddedByAdmin = _context.Users.Where(u => u.Id == b.BlockedByUserId).Select(u => u.FullName).FirstOrDefault(),
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<DomainBlacklistEntryDto> AddToBlacklistAsync(CreateBlacklistEntryDto dto, long adminUserId)
    {
        var entity = new DomainBlacklistEntry
        {
            DomainPattern = dto.DomainPattern,
            Reason = dto.Reason,
            BlockedByUserId = adminUserId
        };
        _context.Set<DomainBlacklistEntry>().Add(entity);
        await _context.SaveChangesAsync();

        return new DomainBlacklistEntryDto
        {
            Id = entity.Id,
            DomainPattern = entity.DomainPattern,
            Reason = entity.Reason,
            AddedByAdmin = await _context.Users.Where(u => u.Id == adminUserId).Select(u => u.FullName).FirstOrDefaultAsync(),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task RemoveFromBlacklistAsync(long id)
    {
        var entity = await _context.Set<DomainBlacklistEntry>().FindAsync(id)
            ?? throw new InvalidOperationException("القيد غير موجود");
        _context.Set<DomainBlacklistEntry>().Remove(entity);
        await _context.SaveChangesAsync();
    }

    public async Task<bool> IsDomainBlacklistedAsync(string domainName)
    {
        return await _context.Set<DomainBlacklistEntry>()
            .AnyAsync(b => domainName.Contains(b.DomainPattern));
    }

    #endregion

    #region Status Report / Seeding

    public async Task<List<ManagedDomainDto>> GetDomainStatusReportAsync(string? filter)
    {
        var query = _context.Set<ManagedDomain>()
            .Include(d => d.Store)
            .AsQueryable();

        if (!string.IsNullOrEmpty(filter))
        {
            query = filter switch
            {
                "connected" => query.Where(d => d.Status == ManagedDomainStatus.Active),
                "dns_error" => query.Where(d => d.Status == ManagedDomainStatus.Failed || d.Status == ManagedDomainStatus.PendingDns),
                "ssl_expired" => query.Where(d => d.SslCertificates.Any(c => c.Status == SslStatus.Expired || c.Status == SslStatus.Failed)),
                _ => query
            };
        }

        return await query
            .OrderByDescending(d => d.CreatedAt)
            .Select(d => new ManagedDomainDto
            {
                Id = d.Id,
                StoreId = d.StoreId,
                StoreName = d.Store != null ? d.Store.StoreName : null,
                DomainName = d.DomainName,
                Type = d.Type.ToString(),
                Status = d.Status.ToString(),
                DnsStatus = d.DnsVerifiedAt != null ? "Verified" : "Pending",
                SslStatus = d.SslCertificates.OrderByDescending(s => s.CreatedAt).Select(s => s.Status.ToString()).FirstOrDefault() ?? "Pending",
                IsPrimary = d.Type == ManagedDomainType.Subdomain,
                TargetIp = d.TargetIp,
                SslEnabled = d.SslEnabled,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();
    }

    public async Task SeedSubdomainsForExistingStoresAsync()
    {
        var storesWithoutSubdomain = await _context.Set<Store>()
            .Where(s => !_context.Set<ManagedDomain>().Any(d => d.StoreId == s.Id && d.Type == ManagedDomainType.Subdomain))
            .ToListAsync();

        foreach (var store in storesWithoutSubdomain)
        {
            var subdomain = $"{store.StoreSlug}.{PlatformDomain}";
            var entity = new ManagedDomain
            {
                StoreId = store.Id,
                DomainName = subdomain,
                Type = ManagedDomainType.Subdomain,
                Status = ManagedDomainStatus.Active,
                SslEnabled = true,
                TargetIp = DefaultTargetIp,
                TargetCname = DefaultTargetCname,
                DnsVerifiedAt = DateTime.UtcNow
            };
            _context.Set<ManagedDomain>().Add(entity);

            var (certPem, keyPem, issuer, notBefore, expiresAt) = GenerateSelfSignedCertificate(subdomain);
            var sslRecord = new SslCertificate
            {
                ManagedDomain = entity,
                CertificateData = certPem,
                PrivateKey = keyPem,
                Issuer = issuer,
                NotBefore = notBefore,
                ExpiresAt = expiresAt,
                LastRenewedAt = DateTime.UtcNow,
                Status = SslStatus.Active
            };
            _context.Set<SslCertificate>().Add(sslRecord);
        }

        await _context.SaveChangesAsync();
    }

    public async Task AutoCreateSubdomainAsync(long storeId, string slug)
    {
        var subdomain = $"{slug}.{PlatformDomain}";

        var exists = await _context.Set<ManagedDomain>().AnyAsync(d => d.DomainName == subdomain);
        if (exists) return;

        var entity = new ManagedDomain
        {
            StoreId = storeId,
            DomainName = subdomain,
            Type = ManagedDomainType.Subdomain,
            Status = ManagedDomainStatus.Active,
            SslEnabled = true,
            TargetIp = DefaultTargetIp,
            TargetCname = DefaultTargetCname,
            DnsVerifiedAt = DateTime.UtcNow
        };
        _context.Set<ManagedDomain>().Add(entity);

        var (certPem, keyPem, issuer, notBefore, expiresAt) = GenerateSelfSignedCertificate(subdomain);
        var sslRecord = new SslCertificate
        {
            ManagedDomain = entity,
            CertificateData = certPem,
            PrivateKey = keyPem,
            Issuer = issuer,
            NotBefore = notBefore,
            ExpiresAt = expiresAt,
            LastRenewedAt = DateTime.UtcNow,
            Status = SslStatus.Active
        };
        _context.Set<SslCertificate>().Add(sslRecord);

        await _context.SaveChangesAsync();
    }

    #endregion
}