using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Banners;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores/banners")]
[Authorize]
public class BannerController : ControllerBase
{
    private readonly IBannerService _bannerService;
    private readonly IPermissionCheckService _permCheck;

    public BannerController(IBannerService bannerService, IPermissionCheckService permCheck)
    {
        _bannerService = bannerService;
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
    public async Task<IActionResult> GetBanners()
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _bannerService.GetBannersAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost]
    public async Task<IActionResult> CreateBanner([FromBody] CreateBannerDto dto)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _bannerService.CreateBannerAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إضافة البنر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateBanner(long id, [FromBody] UpdateBannerDto dto)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _bannerService.UpdateBannerAsync(storeId.Value, id, dto);
            if (result == null)
                return NotFound(new { success = false, message = "البنر غير موجود" });

            return Ok(new { success = true, data = result, message = "تم تحديث البنر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteBanner(long id)
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _bannerService.DeleteBannerAsync(storeId.Value, id);
        if (!result)
            return NotFound(new { success = false, message = "البنر غير موجود" });

        return Ok(new { success = true, data = new { id }, message = "تم حذف البنر بنجاح" });
    }
}