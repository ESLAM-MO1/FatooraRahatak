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
    private readonly ISiteMenuService _siteMenuService;
    private readonly IDashboardSectionService _dashboardSectionService;
    private readonly ICareerService _careerService;
    private readonly IAcademyService _academyService;
    public SiteController(ISiteService siteService, ISiteMenuService siteMenuService, IDashboardSectionService dashboardSectionService, ICareerService careerService, IAcademyService academyService) { _siteService = siteService; _siteMenuService = siteMenuService; _dashboardSectionService = dashboardSectionService; _careerService = careerService; _academyService = academyService; }
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

[HttpGet("menus")]
    public async Task<IActionResult> GetMenus()
    {
        var data = await _siteMenuService.GetAllMenusAsync();
        return Ok(new { success = true, data });
    }

[HttpGet("dashboard-sections")]
    public async Task<IActionResult> GetDashboardSections([FromQuery] string? role)
    {
        var data = await _dashboardSectionService.GetAllAsync(role);
        return Ok(new { success = true, data });
    }

    [HttpGet("jobs")]
    public async Task<IActionResult> GetJobs()
    {
        var data = await _careerService.GetJobsAsync(true);
        return Ok(new { success = true, data });
    }

    [HttpPost("jobs/{id}/apply")]
    public async Task<IActionResult> ApplyJob(long id, [FromBody] ApplyJobDto dto)
    {
        try
        {
            await _careerService.ApplyAsync(id, dto);
            return Ok(new { success = true, message = "تم استلام طلبك" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("courses")]
    public async Task<IActionResult> GetCourses()
    {
        var data = await _academyService.GetCoursesAsync(true);
        return Ok(new { success = true, data });
    }
}
