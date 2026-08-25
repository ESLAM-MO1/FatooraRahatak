using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores/platform-integrations")]
[Authorize]
public class PlatformIntegrationController : ControllerBase
{
    private readonly IPlatformIntegrationService _platformIntegrationService;
    private readonly IPermissionCheckService _permCheck;

    public PlatformIntegrationController(IPlatformIntegrationService platformIntegrationService, IPermissionCheckService permCheck)
    {
        _platformIntegrationService = platformIntegrationService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> ResolveStoreIdAsync()
    {
        return await _permCheck.GetUserStoreIdAsync(GetUserId());
    }

    [RequirePermission("StoreSettings.View")]
    [HttpGet]
    public async Task<IActionResult> GetIntegrations()
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _platformIntegrationService.GetIntegrationsAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("connect")]
    public async Task<IActionResult> Connect([FromBody] ConnectPlatformIntegrationDto dto)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _platformIntegrationService.ConnectAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم ربط المنصة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdatePlatformIntegrationDto dto)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _platformIntegrationService.UpdateAsync(storeId.Value, id, dto);
            if (result == null)
                return NotFound(new { success = false, message = "المنصة غير مرتبطة" });

            return Ok(new { success = true, data = result, message = "تم تحديث الإعدادات بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _platformIntegrationService.DeleteAsync(storeId.Value, id);
        if (!result)
            return NotFound(new { success = false, message = "المنصة غير مرتبطة" });

        return Ok(new { success = true, data = new { id }, message = "تم إلغاء ربط المنصة" });
    }
}