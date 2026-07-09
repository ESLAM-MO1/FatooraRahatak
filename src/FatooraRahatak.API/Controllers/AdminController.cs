using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
namespace FatooraRahatak.API.Controllers;
[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    public AdminController(IAdminService adminService)
    {
        _adminService = adminService;
    }
    private bool IsSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role == "SuperAdmin";
    }
    private IActionResult CheckSuperAdmin()
    {
        if (!IsSuperAdmin())
            return Forbid();
        return null!;
    }
    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet("stores")]
    public async Task<IActionResult> GetAllStores()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var stores = await _adminService.GetAllStoresAsync();
        return Ok(new { success = true, data = stores });
    }
    [HttpGet("stores/{id}")]
    public async Task<IActionResult> GetStoreById(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var store = await _adminService.GetStoreByIdAsync(id);
        if (store == null)
            return NotFound(new { success = false, message = "المتجر غير موجود" });
        return Ok(new { success = true, data = store });
    }
    [HttpPut("stores/{id}/suspend")]
    public async Task<IActionResult> SuspendStore(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.SuspendStoreAsync(id);
            return Ok(new { success = true, message = "تم تعليق المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("stores/{id}/activate")]
    public async Task<IActionResult> ActivateStore(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateStoreAsync(id);
            return Ok(new { success = true, message = "تم تفعيل المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("stores/{id}/custom-domain/activate")]
    public async Task<IActionResult> ActivateCustomDomain(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateCustomDomainAsync(id);
            return Ok(new { success = true, message = "تم تفعيل الدومين الخاص بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("packages")]
    public async Task<IActionResult> GetAllPackages()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var packages = await _adminService.GetAllPackagesAsync();
        return Ok(new { success = true, data = packages });
    }
    [HttpGet("packages/{id}")]
    public async Task<IActionResult> GetPackageById(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var package = await _adminService.GetPackageByIdAsync(id);
        if (package == null)
            return NotFound(new { success = false, message = "الباقة غير موجودة" });
        return Ok(new { success = true, data = package });
    }
    [HttpPut("packages/{id}")]
    public async Task<IActionResult> UpdatePackage(long id, [FromBody] UpdatePackageDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.UpdatePackageAsync(id, dto);
            return Ok(new { success = true, message = "تم تحديث الباقة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // --- تاسك 11: إدارة المستخدمين على مستوى المنصة ---

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var users = await _adminService.GetAllUsersAsync();
        return Ok(new { success = true, data = users });
    }

    [HttpPut("users/{id}/deactivate")]
    public async Task<IActionResult> DeactivateUser(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.DeactivateUserAsync(id, GetCurrentUserId());
            return Ok(new { success = true, message = "تم تعطيل المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("users/{id}/activate")]
    public async Task<IActionResult> ActivateUser(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateUserAsync(id);
            return Ok(new { success = true, message = "تم تفعيل المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("reports/overview")]
    public async Task<IActionResult> GetReportsOverview()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var overview = await _adminService.GetReportsOverviewAsync();
        return Ok(new { success = true, data = overview });
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var settings = await _adminService.GetSettingsAsync();
        return Ok(new { success = true, data = settings });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdatePlatformSettingsDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        await _adminService.UpdateSettingsAsync(dto);
        return Ok(new { success = true, message = "تم تحديث الإعدادات بنجاح" });
    }
}