using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/admin/domains")]
[Authorize]
public class DomainController : ControllerBase
{
    private readonly IDomainService _domainService;

    public DomainController(IDomainService domainService)
    {
        _domainService = domainService;
    }

    private bool IsSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role == "SuperAdmin";
    }

    private IActionResult CheckSuperAdmin()
    {
        if (!IsSuperAdmin()) return Forbid();
        return null!;
    }

    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAllDomains()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetAllDomainsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost]
    public async Task<IActionResult> CreateDomain([FromBody] CreateManagedDomainDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.CreateDomainAsync(dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateDomainStatus(long id, [FromBody] string status)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.UpdateDomainStatusAsync(id, status);
        return Ok(new { success = true, data });
    }

    [HttpGet("verify-dns")]
    public async Task<IActionResult> VerifyDns([FromQuery] string domain, [FromQuery] string? expectedIp, [FromQuery] string? expectedCname)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.VerifyDnsAsync(domain, expectedIp, expectedCname);
        return Ok(new { success = true, data });
    }

    [HttpPost("{storeId}/auto-subdomain/{slug}")]
    public async Task<IActionResult> AutoCreateSubdomain(long storeId, string slug)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        await _domainService.AutoCreateSubdomainAsync(storeId, slug);
        return Ok(new { success = true, message = "تم إنشاء الدومين الفرعي" });
    }

    [HttpGet("custom")]
    public async Task<IActionResult> GetCustomDomains()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetCustomDomainsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("custom")]
    public async Task<IActionResult> BindCustomDomain([FromBody] BindCustomDomainDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.BindCustomDomainAsync(dto.StoreId, dto.DomainName);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("custom/{storeId}/dns-verified")]
    public async Task<IActionResult> SetCustomDomainDnsVerified(long storeId)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.SetCustomDomainDnsVerifiedAsync(storeId);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("custom/{storeId}")]
    public async Task<IActionResult> RemoveCustomDomain(long storeId)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var ok = await _domainService.RemoveCustomDomainAsync(storeId);
        return ok ? Ok(new { success = true }) : NotFound(new { success = false, message = "المتجر غير موجود" });
    }

    [HttpGet("ssl")]
    public async Task<IActionResult> GetAllSslCertificates()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetAllSslCertificatesAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("ssl/{domainId}/request")]
    public async Task<IActionResult> RequestSsl(long domainId)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.RequestSslAsync(domainId);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("ssl/renew-expiring")]
    public async Task<IActionResult> RenewExpiringSsl()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        await _domainService.RenewExpiringSslAsync();
        return Ok(new { success = true, message = "تم تجديد الشهادات المنتهية" });
    }

    [HttpGet("dns-records")]
    public async Task<IActionResult> GetDnsRecords()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetDnsRecordsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("dns-records")]
    public async Task<IActionResult> CreateDnsRecord([FromBody] CreateDnsRecordDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.CreateDnsRecordAsync(dto);
        return Ok(new { success = true, data });
    }

    [HttpPut("dns-records/{id}")]
    public async Task<IActionResult> UpdateDnsRecord(long id, [FromBody] CreateDnsRecordDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.UpdateDnsRecordAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("dns-records/{id}")]
    public async Task<IActionResult> DeleteDnsRecord(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.DeleteDnsRecordAsync(id);
            return Ok(new { success = true, message = "تم الحذف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("redirects")]
    public async Task<IActionResult> GetRedirectRules()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetRedirectRulesAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("redirects")]
    public async Task<IActionResult> CreateRedirectRule([FromBody] CreateRedirectRuleDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.CreateRedirectRuleAsync(dto);
        return Ok(new { success = true, data });
    }

    [HttpPut("redirects/{id}")]
    public async Task<IActionResult> UpdateRedirectRule(long id, [FromBody] CreateRedirectRuleDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.UpdateRedirectRuleAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("redirects/{id}")]
    public async Task<IActionResult> DeleteRedirectRule(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.DeleteRedirectRuleAsync(id);
            return Ok(new { success = true, message = "تم الحذف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("lookup")]
    public async Task<IActionResult> LookupDomain([FromQuery] string domain)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.LookupDomainAsync(domain);
        return Ok(new { success = true, data });
    }

    [HttpGet("registrations")]
    public async Task<IActionResult> GetRegistrationRequests()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetRegistrationRequestsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("registrations")]
    public async Task<IActionResult> CreateRegistrationRequest([FromBody] CreateRegistrationRequestDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.CreateRegistrationRequestAsync(dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("email-setups")]
    public async Task<IActionResult> GetEmailSetups()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetEmailSetupsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("email-setups")]
    public async Task<IActionResult> CreateEmailSetup([FromBody] CreateEmailSetupDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _domainService.CreateEmailSetupAsync(dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("email-setups/{id}/toggle")]
    public async Task<IActionResult> ToggleEmailSetup(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.ToggleEmailSetupAsync(id);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("email-setups/{id}")]
    public async Task<IActionResult> DeleteEmailSetup(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.DeleteEmailSetupAsync(id);
            return Ok(new { success = true, message = "تم الحذف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("blacklist")]
    public async Task<IActionResult> GetBlacklist()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetBlacklistAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("blacklist")]
    public async Task<IActionResult> AddToBlacklist([FromBody] CreateBlacklistEntryDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var adminId = GetCurrentUserId();
        var data = await _domainService.AddToBlacklistAsync(dto, adminId);
        return Ok(new { success = true, data });
    }

    [HttpDelete("blacklist/{id}")]
    public async Task<IActionResult> RemoveFromBlacklist(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _domainService.RemoveFromBlacklistAsync(id);
            return Ok(new { success = true, message = "تم الحذف" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("status-report")]
    public async Task<IActionResult> GetDomainStatusReport([FromQuery] string? filter)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _domainService.GetDomainStatusReportAsync(filter);
        return Ok(new { success = true, data });
    }
}
