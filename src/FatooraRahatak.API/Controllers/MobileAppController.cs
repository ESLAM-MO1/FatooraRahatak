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
    private readonly IMobileAppBuildService _buildService;
    private readonly IPermissionCheckService _permCheck;

    public MobileAppController(
        IMobileAppSubscriptionService service,
        IMobileAppBuildService buildService,
        IPermissionCheckService permCheck)
    {
        _service = service;
        _buildService = buildService;
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

    // ── حزمة بيانات المتجر الفعلية (تُغذّي المصمّم والمعاينة) ──
    [RequirePermission("StoreSettings.View")]
    [HttpGet("bundle")]
    public async Task<IActionResult> GetBundle()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        try
        {
            var data = await _service.GetBundleAsync(storeId.Value);
            return Ok(new { success = true, data });
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

    // ── رفع أيقونة التطبيق (نقطة مخصّصة بدل إعادة استخدام رفع صور المنتجات) ──
    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("icon"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadIcon(IFormFile file)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });

        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "الملف مطلوب" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        if (!allowed.Contains(ext))
            return BadRequest(new { success = false, message = "صيغة الأيقونة غير مدعومة. استخدم PNG أو JPG أو WebP" });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, message = "حجم الأيقونة يتجاوز 5 ميجابايت" });

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "app-icons");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"app-icon-{storeId}-{Guid.NewGuid():N}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var url = Helpers.UrlHelpers.AbsoluteUrl(Request, $"/uploads/app-icons/{fileName}");
        return Ok(new { success = true, data = new { url } });
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

    // ── بناء التطبيق (APK) ──
    // أحدث عملية بناء لتطبيق المتجر (لعرض الحالة في لوحة التاجر).
    [RequirePermission("StoreSettings.View")]
    [HttpGet("build")]
    public async Task<IActionResult> GetLatestBuild()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        var data = await _buildService.GetLatestForStoreAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    // تنزيل ملف APK المبني (للتاجر، بعد نجاح البناء).
    [RequirePermission("StoreSettings.View")]
    [HttpGet("build/download")]
    public async Task<IActionResult> DownloadBuild()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالمستخدم" });
        var latest = await _buildService.GetLatestForStoreAsync(storeId.Value);
        if (latest == null) return NotFound(new { success = false, message = "لا يوجد بناء جاهز" });
        var file = await _buildService.GetApkFileAsync(latest.Id);
        if (file == null) return NotFound(new { success = false, message = "ملف الـ APK غير جاهز" });
        var (path, fileName) = file.Value;
        return PhysicalFile(path, "application/vnd.android.package-archive", fileName);
    }
}
