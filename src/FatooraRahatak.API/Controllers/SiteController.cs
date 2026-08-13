using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/site")]
public class SiteController : ControllerBase
{
    private readonly ISiteService _siteService;
    public SiteController(ISiteService siteService) { _siteService = siteService; }
    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("pages/{pageKey}")]
    public async Task<IActionResult> GetPage(string pageKey)
    {
        var page = await _siteService.GetPageByKeyAsync(pageKey);
        if (page == null) return NotFound(new { success = false, message = "غير موجود" });
        return Ok(new { success = true, data = page });
    }

    [HttpGet("faq")]
    public async Task<IActionResult> GetFaq() =>
        Ok(new { success = true, data = await _siteService.GetPublishedFaqAsync() });

    [HttpPost("contact")]
    public async Task<IActionResult> SendContactMessage([FromBody] CreateContactMessageDto dto)
    {
        var result = await _siteService.CreateContactMessageAsync(dto);
        return Ok(new { success = true, data = result, message = "تم إرسال رسالتك بنجاح" });
    }

    [HttpGet("blog")]
    public async Task<IActionResult> GetBlog() =>
        Ok(new { success = true, data = await _siteService.GetPublishedBlogPostsAsync() });

    [HttpGet("blog/{slug}")]
    public async Task<IActionResult> GetBlogPost(string slug)
    {
        var post = await _siteService.GetBlogPostBySlugAsync(slug);
        if (post == null) return NotFound(new { success = false, message = "غير موجود" });
        return Ok(new { success = true, data = post });
    }

    [HttpGet("landing-page")]
    public async Task<IActionResult> GetLandingPage()
    {
        var content = await _siteService.GetLandingPageAsync();
        return Ok(new { success = true, data = content });
    }

    [HttpGet("packages")]
    public async Task<IActionResult> GetPackages()
    {
        var packages = await _siteService.GetAllActivePackagesAsync();
        return Ok(new { success = true, data = packages });
    }

    [Authorize]
    [HttpGet("tickets/{id}")]
    public async Task<IActionResult> GetMyTicket(long id)
    {
        var userId = GetCurrentUserId();
        var msg = await _siteService.GetCustomerTicketByIdAsync(id, userId);
        if (msg == null) return NotFound(new { success = false, message = "التذكرة غير موجودة" });
        return Ok(new { success = true, data = msg });
    }

    [Authorize]
    [HttpPost("tickets/{id}/replies")]
    public async Task<IActionResult> AddMyTicketReply(long id, [FromBody] CreateTicketReplyDto dto)
    {
        var userId = GetCurrentUserId();
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "عميل";
        try
        {
            var reply = await _siteService.AddCustomerTicketReplyAsync(id, dto, userId, userName);
            return Ok(new { success = true, data = reply, message = "تم إضافة ردك" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("themes")]
    public async Task<IActionResult> GetThemes()
    {
        var themes = await _siteService.GetEnabledThemesAsync();
        return Ok(new { success = true, data = themes });
    }
}
