using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform.Domains;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class DomainService : IDomainService
{
    private readonly AppDbContext _context;
    private const string PlatformDomain = "fatorahr.com";

    public DomainService(AppDbContext context)
    {
        _context = context;
    }

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
            TargetIp = dto.TargetIp,
            TargetCname = dto.TargetCname,
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

    public async Task<DnsCheckResultDto> VerifyDnsAsync(string domainName, string? expectedIp, string? expectedCname)
    {
        var result = new DnsCheckResultDto();

        try
        {
            var hostEntry = await System.Net.Dns.GetHostEntryAsync(domainName);
            result.ResolvedIps = hostEntry.AddressList.Select(a => a.ToString()).ToList();
            result.ResolvedCnames = hostEntry.Aliases.ToList();

            if (!string.IsNullOrEmpty(expectedIp))
            {
                if (result.ResolvedIps.Any(ip => ip == expectedIp))
                {
                    result.Success = true;
                    result.Message = "✅ تطابق سجل A بنجاح";
                }
                else
                {
                    result.Success = false;
                    result.Message = $"❌ سجل A غير متطابق. القيمة المتوقعة: {expectedIp}، القيمة الحالية: {string.Join(", ", result.ResolvedIps)}";
                }
            }
            else if (!string.IsNullOrEmpty(expectedCname))
            {
                if (result.ResolvedCnames.Any(c => c.Contains(expectedCname.Replace("http://", "").Replace("https://", "").Trim('/'))))
                {
                    result.Success = true;
                    result.Message = "✅ تطابق سجل CNAME بنجاح";
                }
                else
                {
                    result.Success = false;
                    result.Message = $"❌ سجل CNAME غير متطابق";
                }
            }
            else
            {
                if (result.ResolvedIps.Count > 0)
                {
                    result.Success = true;
                    result.Message = "✅ تم حل اسم الدومين بنجاح";
                }
                else
                {
                    result.Success = false;
                    result.Message = "❌ لم يتم العثور على أي سجلات DNS";
                }
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"❌ فشل فحص DNS: {ex.Message}";
        }

        return result;
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
            SslEnabled = false,
            DnsVerifiedAt = DateTime.UtcNow
        };

        _context.Set<ManagedDomain>().Add(entity);

        var sslRecord = new SslCertificate
        {
            ManagedDomain = entity,
            Status = SslStatus.Issuing
        };
        _context.Set<SslCertificate>().Add(sslRecord);

        await _context.SaveChangesAsync();
    }

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
                Status = s.Status.ToString(),
                ExpiresAt = s.ExpiresAt,
                FailureReason = s.FailureReason,
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<SslCertificateDto> RequestSslAsync(long domainId)
    {
        var domain = await _context.Set<ManagedDomain>().FindAsync(domainId)
            ?? throw new InvalidOperationException("الدومين غير موجود");

        var ssl = new SslCertificate
        {
            ManagedDomainId = domainId,
            Status = SslStatus.Issuing
        };
        _context.Set<SslCertificate>().Add(ssl);
        domain.SslEnabled = true;
        await _context.SaveChangesAsync();

        return new SslCertificateDto
        {
            Id = ssl.Id,
            ManagedDomainId = domainId,
            DomainName = domain.DomainName,
            Status = ssl.Status.ToString(),
            CreatedAt = ssl.CreatedAt
        };
    }

    public async Task RenewExpiringSslAsync()
    {
        var expiringSoon = await _context.Set<SslCertificate>()
            .Where(s => s.Status == SslStatus.Active && s.ExpiresAt != null && s.ExpiresAt < DateTime.UtcNow.AddDays(14))
            .ToListAsync();

        foreach (var cert in expiringSoon)
        {
            cert.Status = SslStatus.Issuing;
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<DnsRecordDto>> GetDnsRecordsAsync()
    {
        return await _context.Set<DnsRecord>()
            .Where(r => r.IsActive)
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
                IsActive = r.IsActive
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
            IsActive = entity.IsActive
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
                IsPermanent = r.IsPermanent,
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
            IsPermanent = dto.IsPermanent,
            IsActive = true
        };
        _context.Set<RedirectRule>().Add(entity);
        await _context.SaveChangesAsync();

        return new RedirectRuleDto
        {
            Id = entity.Id,
            SourceDomain = entity.SourceDomain,
            SourcePath = entity.SourcePath,
            TargetUrl = entity.TargetUrl,
            IsPermanent = entity.IsPermanent,
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
        entity.IsPermanent = dto.IsPermanent;
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
            RegistrarApi = entity.RegistrarApi,
            Price = entity.Price,
            Status = entity.Status.ToString(),
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task<List<ProfessionalEmailSetupDto>> GetEmailSetupsAsync()
    {
        return await _context.Set<ProfessionalEmailSetup>()
            .Include(e => e.Store)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new ProfessionalEmailSetupDto
            {
                Id = e.Id,
                StoreId = e.StoreId,
                StoreName = e.Store.StoreName,
                DomainName = e.DomainName,
                EmailProvider = e.EmailProvider,
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
            EmailProvider = dto.EmailProvider,
            IsActive = true
        };
        _context.Set<ProfessionalEmailSetup>().Add(entity);
        await _context.SaveChangesAsync();

        return new ProfessionalEmailSetupDto
        {
            Id = entity.Id,
            StoreId = entity.StoreId,
            DomainName = entity.DomainName,
            EmailProvider = entity.EmailProvider,
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

    public async Task<List<DomainBlacklistEntryDto>> GetBlacklistAsync()
    {
        return await _context.Set<DomainBlacklistEntry>()
            .OrderByDescending(b => b.CreatedAt)
            .Select(b => new DomainBlacklistEntryDto
            {
                Id = b.Id,
                DomainPattern = b.DomainPattern,
                Reason = b.Reason,
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
                SslEnabled = false,
                DnsVerifiedAt = DateTime.UtcNow
            };
            _context.Set<ManagedDomain>().Add(entity);

            var sslRecord = new SslCertificate
            {
                ManagedDomain = entity,
                Status = SslStatus.Issuing
            };
            _context.Set<SslCertificate>().Add(sslRecord);
        }

        await _context.SaveChangesAsync();
    }

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
}
