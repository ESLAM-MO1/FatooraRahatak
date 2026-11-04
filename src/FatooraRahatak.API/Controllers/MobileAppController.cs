using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.API.Filters;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

// واجهات التاجر لخدمة "صناعة تطبيقات الجوال".
[ApiController]
[Route("api/v1/mobile-app")]
[Authorize]
public class MobileAppController : ControllerBase
{
    private readonly IMobileAppSubscriptionService _service;
    private readonly IPermissionCheckService _permCheck;

    public MobileAppController(IMobileAppSubscriptionService service, IPermissionCheckService permCheck)
    {
        _service = service;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("StoreSettings.View")]
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        var data = await _service.GetStatusAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] SubscribeMobileAppDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        try
        {
            var data = await _service.SubscribeAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data, message = "تم إنشاء طلب الاشتراك بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        try
        {
            await _service.CancelAsync(storeId.Value);
            return Ok(new { success = true, message = "تم إلغاء اشتراك تطبيق الجوال" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
