using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Marketing;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/marketing")]
[Authorize]
public class MarketingController : ControllerBase
{
    private readonly IMarketingService _marketingService;
    private readonly IPermissionCheckService _permCheck;

    public MarketingController(IMarketingService marketingService, IPermissionCheckService permCheck)
    {
        _marketingService = marketingService;
        _permCheck = permCheck;
    }

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync() => await _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("StoreSettings.View")]
    [HttpGet("integrations")]
    public async Task<IActionResult> GetIntegrations()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        var data = await _marketingService.GetIntegrationsAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("integrations")]
    public async Task<IActionResult> UpsertIntegration([FromBody] UpsertMarketingIntegrationDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        try
        {
            var data = await _marketingService.UpsertIntegrationAsync(storeId.Value, dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("integrations/{id}/toggle")]
    public async Task<IActionResult> ToggleIntegration(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        await _marketingService.ToggleIntegrationAsync(storeId.Value, id);
        return Ok(new { success = true });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpDelete("integrations/{id}")]
    public async Task<IActionResult> DeleteIntegration(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        await _marketingService.DeleteIntegrationAsync(storeId.Value, id);
        return Ok(new { success = true });
    }

    [RequirePermission("StoreSettings.View")]
    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        var data = await _marketingService.GetCampaignsAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateMarketingCampaignDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        try
        {
            var data = await _marketingService.CreateCampaignAsync(storeId.Value, dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("campaigns/{id}")]
    public async Task<IActionResult> UpdateCampaign(long id, [FromBody] CreateMarketingCampaignDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        try
        {
            var data = await _marketingService.UpdateCampaignAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpDelete("campaigns/{id}")]
    public async Task<IActionResult> DeleteCampaign(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        await _marketingService.DeleteCampaignAsync(storeId.Value, id);
        return Ok(new { success = true });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("integrations/{id}/test")]
    public async Task<IActionResult> TestConversionEvent(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        try
        {
            var result = await _marketingService.TestConversionEventAsync(storeId.Value, id);
            return Ok(new { success = result.Success, message = result.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.View")]
    [HttpGet("performance")]
    public async Task<IActionResult> GetPerformance([FromQuery] DateTime? from, [FromQuery] DateTime? to)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        var data = await _marketingService.GetPerformanceAsync(storeId.Value, from, to);
        return Ok(new { success = true, data });
    }
}