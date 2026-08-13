using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/fixed-assets")]
[Authorize]
[RequirePackageFeature("HasAccountingFull")]
public class FixedAssetsController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;

    public FixedAssetsController(IAccountingService accountingService, IPermissionCheckService permCheck)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("FixedAssets.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateFixedAsset([FromBody] CreateFixedAssetDto dto)
    {
        var userId = GetUserId();
        try
        {
            var result = await _accountingService.CreateFixedAssetAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الأصل الثابت بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("FixedAssets.View")]
    [HttpGet]
    public async Task<IActionResult> GetFixedAssets()
    {
        var result = await _accountingService.GetFixedAssetsAsync(GetUserId());
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("FixedAssets.Edit")]
    [HttpPost("run-depreciation")]
    public async Task<IActionResult> RunDepreciation([FromBody] RunDepreciationDto dto)
    {
        var userId = GetUserId();
        try
        {
            var result = await _accountingService.RunDepreciationAsync(userId, dto);
            return Ok(new { success = true, data = result, message = $"تم تشغيل الإهلاك بنجاح لعدد {result.Count} أصل" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}