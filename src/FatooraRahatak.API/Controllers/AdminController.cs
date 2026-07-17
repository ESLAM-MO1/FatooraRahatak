using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
namespace FatooraRahatak.API.Controllers;
[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ISiteService _siteService;
    public AdminController(IAdminService adminService, ISiteService siteService)
    {
        _adminService = adminService;
        _siteService = siteService;
    }
    private bool IsSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role == "SuperAdmin";
    }
    private IActionResult CheckSuperAdmin()
    {
        if (!IsSuperAdmin())
            return Forbid();
        return null!;
    }
    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    [HttpGet("stores")]
    public async Task<IActionResult> GetAllStores()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var stores = await _adminService.GetAllStoresAsync();
        return Ok(new { success = true, data = stores });
    }
    [HttpGet("stores/{id}")]
    public async Task<IActionResult> GetStoreById(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var store = await _adminService.GetStoreByIdAsync(id);
        if (store == null)
            return NotFound(new { success = false, message = "المتجر غير موجود" });
        return Ok(new { success = true, data = store });
    }
    [HttpPut("stores/{id}/suspend")]
    public async Task<IActionResult> SuspendStore(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.SuspendStoreAsync(id);
            return Ok(new { success = true, message = "تم تعليق المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("stores/{id}/activate")]
    public async Task<IActionResult> ActivateStore(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateStoreAsync(id);
            return Ok(new { success = true, message = "تم تفعيل المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("stores/{id}/custom-domain/activate")]
    public async Task<IActionResult> ActivateCustomDomain(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateCustomDomainAsync(id);
            return Ok(new { success = true, message = "تم تفعيل الدومين الخاص بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpGet("packages")]
    public async Task<IActionResult> GetAllPackages()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var packages = await _adminService.GetAllPackagesAsync();
        return Ok(new { success = true, data = packages });
    }
    [HttpGet("packages/{id}")]
    public async Task<IActionResult> GetPackageById(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var package = await _adminService.GetPackageByIdAsync(id);
        if (package == null)
            return NotFound(new { success = false, message = "الباقة غير موجودة" });
        return Ok(new { success = true, data = package });
    }
    [HttpPut("packages/{id}")]
    public async Task<IActionResult> UpdatePackage(long id, [FromBody] UpdatePackageDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.UpdatePackageAsync(id, dto);
            return Ok(new { success = true, message = "تم تحديث الباقة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // --- تاسك 11: إدارة المستخدمين على مستوى المنصة ---

    [HttpGet("users")]
    public async Task<IActionResult> GetAllUsers()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var users = await _adminService.GetAllUsersAsync();
        return Ok(new { success = true, data = users });
    }

    [HttpPut("users/{id}/deactivate")]
    public async Task<IActionResult> DeactivateUser(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.DeactivateUserAsync(id, GetCurrentUserId());
            return Ok(new { success = true, message = "تم تعطيل المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("users/{id}/activate")]
    public async Task<IActionResult> ActivateUser(long id)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            await _adminService.ActivateUserAsync(id);
            return Ok(new { success = true, message = "تم تفعيل المستخدم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("reports/overview")]
    public async Task<IActionResult> GetReportsOverview()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var overview = await _adminService.GetReportsOverviewAsync();
        return Ok(new { success = true, data = overview });
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var settings = await _adminService.GetSettingsAsync();
        return Ok(new { success = true, data = settings });
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdatePlatformSettingsDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        await _adminService.UpdateSettingsAsync(dto);
        return Ok(new { success = true, message = "تم تحديث الإعدادات بنجاح" });
    }

    // === Pages ===
    [HttpGet("site/pages/{pageKey}")]
    public async Task<IActionResult> GetPage(string pageKey)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var page = await _siteService.GetPageByKeyAsync(pageKey);
        return Ok(new { success = true, data = page });
    }

    [HttpPut("site/pages/{pageKey}")]
    public async Task<IActionResult> UpdatePage(string pageKey, [FromBody] UpdateSitePageDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdatePageAsync(GetCurrentUserId(), pageKey, dto);
        return Ok(new { success = true, message = "تم حفظ الصفحة" });
    }

    [HttpPost("site/upload"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadSiteFile(IFormFile file)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "الملف مطلوب" });
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowedImages = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        var allowedVideos = new[] { ".mp4", ".webm", ".mov" };
        bool isVideo = allowedVideos.Contains(ext);
        if (!allowedImages.Contains(ext) && !isVideo)
            return BadRequest(new { success = false, message = "صيغة الملف غير مدعومة" });
        long maxSize = isVideo ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.Length > maxSize)
            return BadRequest(new { success = false, message = $"حجم الملف يتجاوز الحد المسموح {(isVideo ? "50" : "5")} ميجابايت" });
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);
        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);
        using (var stream = new FileStream(filePath, FileMode.Create)) { await file.CopyToAsync(stream); }
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/uploads/{fileName}";
        return Ok(new { success = true, data = new { url } });
    }

    // === FAQ ===
    [HttpGet("site/faq")]
    public async Task<IActionResult> GetAllFaq()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        return Ok(new { success = true, data = await _siteService.GetAllFaqAsync() });
    }

    [HttpPost("site/faq")]
    public async Task<IActionResult> CreateFaq([FromBody] CreateFaqItemDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var result = await _siteService.CreateFaqAsync(dto);
        return Ok(new { success = true, data = result, message = "تمت الإضافة" });
    }

    [HttpPut("site/faq/{id}")]
    public async Task<IActionResult> UpdateFaq(long id, [FromBody] CreateFaqItemDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdateFaqAsync(id, dto);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    [HttpDelete("site/faq/{id}")]
    public async Task<IActionResult> DeleteFaq(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.DeleteFaqAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    // === Contact Messages ===
    [HttpGet("site/contact-messages")]
    public async Task<IActionResult> GetContactMessages()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        return Ok(new { success = true, data = await _siteService.GetContactMessagesAsync() });
    }

    [HttpPut("site/contact-messages/{id}/status")]
    public async Task<IActionResult> UpdateContactMessageStatus(long id, [FromBody] string status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdateContactMessageStatusAsync(id, status);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    // === Blog ===
    [HttpGet("site/blog")]
    public async Task<IActionResult> GetAllBlogPosts()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        return Ok(new { success = true, data = await _siteService.GetAllBlogPostsAsync() });
    }

    [HttpPost("site/blog")]
    public async Task<IActionResult> CreateBlogPost([FromBody] CreateBlogPostDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var result = await _siteService.CreateBlogPostAsync(GetCurrentUserId(), dto);
        return Ok(new { success = true, data = result, message = "تم إنشاء المقال" });
    }

    [HttpPut("site/blog/{id}")]
    public async Task<IActionResult> UpdateBlogPost(long id, [FromBody] UpdateBlogPostDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdateBlogPostAsync(id, dto);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    [HttpDelete("site/blog/{id}")]
    public async Task<IActionResult> DeleteBlogPost(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.DeleteBlogPostAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpPut("site/blog/{id}/publish")]
    public async Task<IActionResult> PublishBlogPost(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.PublishBlogPostAsync(id);
        return Ok(new { success = true, message = "تم النشر" });
    }

    // === Landing Page ===
    [HttpGet("site/landing-page")]
    public async Task<IActionResult> GetLandingPage()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var content = await _siteService.GetLandingPageAsync();
        return Ok(new { success = true, data = content });
    }

    [HttpPut("site/landing-page")]
    public async Task<IActionResult> UpdateLandingPage([FromBody] LandingPageContentDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdateLandingPageAsync(dto);
        return Ok(new { success = true, message = "تم حفظ محتوى الصفحة الرئيسية" });
    }
}