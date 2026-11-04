using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.API.Filters;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

// واجهات التاجر لـ"صانع تطبيقات الجوال" (المسار: صمّم → اشترك → أطلق).
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

    // ── صمّم: حفظ تصميم التطبيق ──
    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("design")]
    public async Task<IActionResult> SaveDesign([FromBody] SaveMobileAppDesignDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        try
        {
            var data = await _service.SaveDesignAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data, message = "تم حفظ تصميم التطبيق" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── أطلق: إرسال التطبيق للنشر ──
    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("publish")]
    public async Task<IActionResult> SubmitForPublish([FromBody] SubmitMobileAppPublishDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        try
        {
            var data = await _service.SubmitForPublishAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data, message = "تم إرسال تطبيقك للنشر، وسيراجعه فريق المنصة خلال 2 إلى 7 أيام" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── الإشعارات ──
    [RequirePermission("StoreSettings.View")]
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        var data = await _service.GetNotificationsAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("notifications")]
    public async Task<IActionResult> SendNotification([FromBody] SendAppNotificationDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        try
        {
            var data = await _service.SendNotificationAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data, message = "تم إرسال الإشعار" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("notifications/{id}/cancel")]
    public async Task<IActionResult> CancelNotification(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        try
        {
            await _service.CancelNotificationAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم إلغاء الإشعار المجدول" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.View")]
    [HttpGet("notifications/automated")]
    public async Task<IActionResult> GetAutomatedNotifications()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        var data = await _service.GetAutomatedNotificationsAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("notifications/automated")]
    public async Task<IActionResult> SetAutomatedNotification([FromBody] AutomatedAppNotificationDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        try
        {
            await _service.SetAutomatedNotificationAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تم حفظ الإشعار المؤتمت" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── الإحصاءات ──
    [RequirePermission("StoreSettings.View")]
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics([FromQuery] int days = 30)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        var data = await _service.GetAnalyticsAsync(storeId.Value, days);
        return Ok(new { success = true, data });
    }
}
