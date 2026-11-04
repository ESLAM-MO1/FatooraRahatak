using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

// واجهات إدارة "صانع تطبيقات الجوال" (SuperAdmin أو SupportStaff بدور Admin/Technical).
[ApiController]
[Route("api/v1/admin/app-subscriptions")]
[Authorize(Policy = "MobileAppAdmin")]
public class AdminMobileAppController : ControllerBase
{
    private readonly IMobileAppSubscriptionService _service;

    public AdminMobileAppController(IMobileAppSubscriptionService service)
    {
        _service = service;
    }

    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var data = await _service.GetAllAsync(status);
        return Ok(new { success = true, data });
    }

    // طلبات النشر المعلّقة (بانتظار مراجعة الفريق).
    [HttpGet("pending-publish")]
    public async Task<IActionResult> GetPendingPublish()
    {
        var data = await _service.GetPendingPublishAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(long id, [FromBody] UpdateMobileAppSubscriptionDto dto)
    {
        try
        {
            var data = await _service.CompleteAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data, message = "تم اعتماد الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(long id, [FromBody] UpdateMobileAppSubscriptionDto dto)
    {
        try
        {
            var data = await _service.RejectAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data, message = "تم رفض الطلب" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ── مراجعة طلبات النشر ──
    [HttpPost("{id}/start-review")]
    public async Task<IActionResult> StartReview(long id)
    {
        try
        {
            var data = await _service.StartReviewAsync(id, GetCurrentUserId());
            return Ok(new { success = true, data, message = "بدأت مراجعة الطلب" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(long id, [FromBody] ReviewMobileAppPublishDto dto)
    {
        try
        {
            var data = await _service.PublishAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data, message = "تم نشر التطبيق" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/reject-publish")]
    public async Task<IActionResult> RejectPublish(long id, [FromBody] ReviewMobileAppPublishDto dto)
    {
        try
        {
            var data = await _service.RejectPublishAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data, message = "تم رفض طلب النشر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
