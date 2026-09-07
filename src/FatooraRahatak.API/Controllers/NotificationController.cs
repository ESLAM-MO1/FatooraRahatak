using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;

    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var result = await _notificationService.GetMyNotificationsAsync(GetUserId());
        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id}/read")]
    public async Task<IActionResult> MarkAsRead(long id)
    {
        try
        {
            await _notificationService.MarkAsReadAsync(GetUserId(), id);
            return Ok(new { success = true, message = "تم تعليم الإشعار كمقروء" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        await _notificationService.MarkAllAsReadAsync(GetUserId());
        return Ok(new { success = true, message = "تم تعليم كل الإشعارات كمقروءة" });
    }
}