using Microsoft.AspNetCore.Mvc;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/site")]
public class SiteController : ControllerBase
{
    private readonly ISiteService _siteService;
    public SiteController(ISiteService siteService) { _siteService = siteService; }

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
        await _siteService.CreateContactMessageAsync(dto);
        return Ok(new { success = true, message = "تم إرسال رسالتك بنجاح" });
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
}
