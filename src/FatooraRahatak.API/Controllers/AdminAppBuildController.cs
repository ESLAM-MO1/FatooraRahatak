using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

// واجهات إدارة بناء تطبيقات الجوال (APK) — للأدمن فقط.
[ApiController]
[Route("api/v1/admin/app-builds")]
[Authorize]
public class AdminAppBuildController : ControllerBase
{
    private readonly IMobileAppBuildService _service;

    public AdminAppBuildController(IMobileAppBuildService service)
    {
        _service = service;
    }

    private IActionResult? CheckAccess()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "SuperAdmin")
            return null;
        if (role != "SupportStaff")
            return Forbid();

        var staffRole = User.FindFirstValue("StaffRole");
        if (staffRole != "Admin" && staffRole != "Technical")
            return Forbid();

        return null;
    }

    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // قائمة كل عمليات البناء.
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        var data = await _service.GetAllBuildsAsync(status);
        return Ok(new { success = true, data });
    }

    // أحدث بناء لاشتراك معيّن.
    [HttpGet("by-subscription/{subscriptionId}")]
    public async Task<IActionResult> GetBySubscription(long subscriptionId)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        var data = await _service.GetLatestBuildAsync(subscriptionId);
        return Ok(new { success = true, data });
    }

    // إطلاق بناء APK لاشتراك معيّن.
    [HttpPost("subscription/{subscriptionId}/start")]
    public async Task<IActionResult> Start(long subscriptionId)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _service.StartBuildAsync(subscriptionId, GetCurrentUserId());
            return Ok(new { success = true, data, message = "بدأ بناء التطبيق" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // تحديث حالة بناء بسحب آخر نتيجة من GitHub.
    [HttpPost("{id}/refresh")]
    public async Task<IActionResult> Refresh(long id)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _service.RefreshBuildAsync(id);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // تنزيل ملف APK المبني.
    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(long id)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        var file = await _service.GetApkFileAsync(id);
        if (file == null) return NotFound(new { success = false, message = "ملف الـ APK غير جاهز" });
        var (path, fileName) = file.Value;
        return PhysicalFile(path, "application/vnd.android.package-archive", fileName);
    }
}
