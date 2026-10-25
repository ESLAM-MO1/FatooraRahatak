using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Chat;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/chat")]
[Authorize]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpPost]
    public async Task<IActionResult> Ask([FromBody] ChatRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { success = false, message = "الرسالة مطلوبة" });

        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var result = await _chatService.AskAsync(userId, dto);
        return Ok(new { success = true, data = result });
    }

    // الصفحة الخارجية: بوت معلوماتي عام للزوار غير المسجّلين. لا يصل لأي بيانات
    // متجر ولا ينفّذ أي أداة — يجاوب عن المنصة والباقات والتسجيل فقط.
    [HttpPost("public")]
    [AllowAnonymous]
    public async Task<IActionResult> AskPublic([FromBody] ChatRequestDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Message))
            return BadRequest(new { success = false, message = "الرسالة مطلوبة" });

        var result = await _chatService.AskPublicAsync(dto);
        return Ok(new { success = true, data = result });
    }
}
