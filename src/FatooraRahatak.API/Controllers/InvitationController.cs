using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/invitations")]
[Authorize]
public class InvitationController : ControllerBase
{
    private readonly IInvitationService _invitationService;

    public InvitationController(IInvitationService invitationService)
    {
        _invitationService = invitationService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> CreateInvitation([FromBody] CreateInvitationDto dto)
    {
        try
        {
            var result = await _invitationService.CreateInvitationAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = $"تم إرسال الدعوة إلى {dto.Email}" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetInvitations()
    {
        var result = await _invitationService.GetInvitationsAsync(GetUserId());
        return Ok(new { success = true, data = result });
    }

    [HttpPost("accept")]
    [AllowAnonymous]
    public async Task<IActionResult> AcceptInvitation([FromQuery] string token)
    {
        try
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                return Unauthorized(new { success = false, message = "يجب تسجيل الدخول أولاً" });

            await _invitationService.AcceptInvitationAsync(token, long.Parse(userIdClaim));
            return Ok(new { success = true, message = "تم قبول الدعوة بنجاح، أنت الآن موظف في المتجر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
