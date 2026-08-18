using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.DTOs.Settlement;
using FatooraRahatak.Application.DTOs.Referral;
using FatooraRahatak.Application.DTOs.Merchant;
using FatooraRahatak.Application.Interfaces;
namespace FatooraRahatak.API.Controllers;[ApiController]
[Route("api/v1/admin")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly IAdminService _adminService;
    private readonly ISiteService _siteService;
    private readonly IReferralService _referralService;
    private readonly ISiteMenuService _siteMenuService;
    private readonly IDashboardSectionService _dashboardSectionService;
    private readonly ICareerService _careerService;
    private readonly IAcademyService _academyService;
    private readonly IStoreDesignService _designService;
    private readonly IMerchantVerificationService _verificationService;
    private readonly IMerchantAccountService _merchantAccountService;
    public AdminController(IAdminService adminService, ISiteService siteService, IReferralService referralService, ISiteMenuService siteMenuService, IDashboardSectionService dashboardSectionService, ICareerService careerService, IAcademyService academyService, IStoreDesignService designService, IMerchantVerificationService verificationService, IMerchantAccountService merchantAccountService)
    {
        _adminService = adminService;
        _siteService = siteService;
        _referralService = referralService;
        _siteMenuService = siteMenuService;
        _dashboardSectionService = dashboardSectionService;
        _careerService = careerService;
        _academyService = academyService;
        _designService = designService;
        _verificationService = verificationService;
        _merchantAccountService = merchantAccountService;
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

    [HttpGet("billing/revenue")]
    public async Task<IActionResult> GetRevenueDashboard()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _adminService.GetRevenueDashboardAsync();
        return Ok(new { success = true, data });
    }

    [HttpGet("billing/invoices")]
    public async Task<IActionResult> GetPlatformInvoices([FromQuery] bool? overdueOnly)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _adminService.GetPlatformInvoicesAsync(overdueOnly);
        return Ok(new { success = true, data });
    }

    [HttpGet("billing/invoices/export")]
    public async Task<IActionResult> ExportPlatformInvoices()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var bytes = await _adminService.ExportPlatformInvoicesExcelAsync();
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "platform-invoices.xlsx");
    }

    [HttpGet("users/owners")]
    public async Task<IActionResult> GetOwnerUsers()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _adminService.GetOwnerUsersAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("users/staff")]
    public async Task<IActionResult> CreateStaffUser([FromBody] CreateStaffDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var result = await _adminService.CreateStaffUserAsync(dto);
            return Ok(new { success = true, data = result, message = "تم إضافة الموظف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("users/staff")]
    public async Task<IActionResult> GetStaffUsers()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _adminService.GetStaffUsersAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("notifications/send")]
    public async Task<IActionResult> SendPlatformNotification([FromBody] SendNotificationDto dto)
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        try
        {
            var adminId = GetCurrentUserId();
            await _adminService.SendPlatformNotificationAsync(dto, adminId);
            return Ok(new { success = true, message = "تم إرسال الإشعار بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
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
        var url = Helpers.UrlHelpers.AbsoluteUrl(Request, $"/uploads/{fileName}");
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

    [HttpPut("site/faq/{id}/toggle-publish")]
    public async Task<IActionResult> ToggleFaqPublish(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.ToggleFaqPublishAsync(id);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    // === Contact Messages (Tickets) ===
    [HttpGet("site/contact-messages")]
    public async Task<IActionResult> GetContactMessages([FromQuery] string? status, [FromQuery] string? search)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        return Ok(new { success = true, data = await _siteService.GetContactMessagesAsync(status, search) });
    }

    [HttpGet("site/contact-messages/{id}")]
    public async Task<IActionResult> GetContactMessageById(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var msg = await _siteService.GetContactMessageByIdAsync(id);
        if (msg == null) return NotFound(new { success = false, message = "غير موجود" });
        return Ok(new { success = true, data = msg });
    }

    [HttpPut("site/contact-messages/{id}/status")]
    public async Task<IActionResult> UpdateContactMessageStatus(long id, [FromBody] UpdateTicketStatusDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.UpdateContactMessageStatusAsync(id, dto.Status);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    [HttpPost("site/contact-messages/{id}/replies")]
    public async Task<IActionResult> AddTicketReply(long id, [FromBody] CreateTicketReplyDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var adminName = User.FindFirstValue(ClaimTypes.Name) ?? "المدير";
        try
        {
            var reply = await _siteService.AddTicketReplyAsync(id, dto, GetCurrentUserId(), adminName);
            return Ok(new { success = true, data = reply, message = "تم إضافة الرد" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("site/contact-messages/{id}")]
    public async Task<IActionResult> DeleteContactMessage(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteService.DeleteContactMessageAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
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

    // === Themes ===
    [HttpGet("themes")]
    public async Task<IActionResult> GetAllThemes()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var themes = await _adminService.GetThemesAsync();
        return Ok(new { success = true, data = themes });
    }

    [HttpPut("themes/{id}")]
    public async Task<IActionResult> UpdateTheme(long id, [FromBody] UpdateThemeDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _adminService.SetThemeEnabledAsync(id, dto.IsEnabled);
            return Ok(new { success = true, message = "تم تحديث حالة الثيم بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    // === Referrals ===
    [HttpGet("referrals")]
    public async Task<IActionResult> GetAllReferrals([FromQuery] string? status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _referralService.GetAllReferralsAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpGet("referrals/commissions")]
    public async Task<IActionResult> GetAllCommissions([FromQuery] string? status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _referralService.GetAllCommissionsAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpPut("referrals/commissions/{id}/paid")]
    public async Task<IActionResult> MarkCommissionPaid(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _referralService.MarkCommissionPaidAsync(id);
            return Ok(new { success = true, message = "تم تعليم العمولة كمصروفة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("referrals/withdrawals")]
    public async Task<IActionResult> GetAllWithdrawals([FromQuery] string? status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _referralService.GetAllWithdrawalsAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpPut("referrals/withdrawals/{id}/process")]
    public async Task<IActionResult> ProcessWithdrawal(long id, [FromBody] ProcessWithdrawalDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _referralService.ProcessWithdrawalAsync(id, dto.Approve, dto.Note);
            return Ok(new { success = true, message = dto.Approve ? "تمت الموافقة على طلب السحب" : "تم رفض طلب السحب" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // === Merchant Verification (حساب تاجر / مستندات) ===
    [HttpGet("merchant-verifications")]
    public async Task<IActionResult> GetAllVerifications([FromQuery] string? status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _verificationService.GetAllVerificationsAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpGet("merchant-verifications/{id}")]
    public async Task<IActionResult> GetVerification(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _verificationService.GetAdminVerificationAsync(id);
        if (data == null) return NotFound(new { success = false, message = "طلب التوثيق غير موجود" });
        return Ok(new { success = true, data });
    }

    [HttpPut("merchant-verifications/{id}/review")]
    public async Task<IActionResult> ReviewVerification(long id, [FromBody] ReviewVerificationDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _verificationService.ProcessVerificationAsync(id, dto, GetCurrentUserId());
            return Ok(new { success = true, message = dto.Approve ? "تم اعتماد التوثيق" : "تم رفض التوثيق" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // === Merchant Accounts (حساب التاجر / مراجعة KYC) ===
    [HttpGet("merchant-accounts")]
    public async Task<IActionResult> GetAllMerchantAccounts([FromQuery] string? status)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _merchantAccountService.GetAllAccountsAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpGet("merchant-accounts/{id}")]
    public async Task<IActionResult> GetMerchantAccount(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _merchantAccountService.GetAdminAccountAsync(id);
        if (data == null) return NotFound(new { success = false, message = "حساب التاجر غير موجود" });
        return Ok(new { success = true, data });
    }

    [HttpPut("merchant-accounts/{id}/review")]
    public async Task<IActionResult> ReviewMerchantAccount(long id, [FromBody] ReviewMerchantAccountDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _merchantAccountService.ProcessAccountReviewAsync(id, dto, GetCurrentUserId());
            return Ok(new { success = true, message = dto.Approve ? "تم اعتماد حساب التاجر" : "تم رفض حساب التاجر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // === Site Menus (header/footer + nested sub-menus) ===
    [HttpGet("site/menus")]
    public async Task<IActionResult> GetAllMenus()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _siteMenuService.GetAllMenusAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("site/menus")]
    public async Task<IActionResult> CreateMenu([FromBody] CreateSiteMenuDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var menu = await _siteMenuService.CreateMenuAsync(dto);
            return Ok(new { success = true, data = menu, message = "تمت الإضافة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("site/menus/{id}")]
    public async Task<IActionResult> UpdateMenu(long id, [FromBody] CreateSiteMenuDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _siteMenuService.UpdateMenuAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("site/menus/{id}")]
    public async Task<IActionResult> DeleteMenu(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteMenuService.DeleteMenuAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpPut("site/menus/{id}/toggle")]
    public async Task<IActionResult> ToggleMenu(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _siteMenuService.ToggleMenuActiveAsync(id);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    // === Dashboard Sections (sidebar groups & icons) ===
    [HttpGet("dashboard-sections")]
    public async Task<IActionResult> GetDashboardSections([FromQuery] string? role)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _dashboardSectionService.GetAllAsync(role);
        return Ok(new { success = true, data });
    }

    [HttpPost("dashboard-sections")]
    public async Task<IActionResult> CreateDashboardSection([FromBody] UpsertDashboardSectionDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var section = await _dashboardSectionService.CreateAsync(dto);
            return Ok(new { success = true, data = section, message = "تمت الإضافة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("dashboard-sections/{id}")]
    public async Task<IActionResult> UpdateDashboardSection(long id, [FromBody] UpsertDashboardSectionDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _dashboardSectionService.UpdateAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("dashboard-sections/{id}")]
    public async Task<IActionResult> DeleteDashboardSection(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _dashboardSectionService.DeleteAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpPut("dashboard-sections/{id}/toggle")]
    public async Task<IActionResult> ToggleDashboardSection(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _dashboardSectionService.ToggleAsync(id);
        return Ok(new { success = true, message = "تم التحديث" });
    }

    // === Careers (job postings & applications) ===
    [HttpGet("jobs")]
    public async Task<IActionResult> GetJobs()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _careerService.GetJobsAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("jobs")]
    public async Task<IActionResult> CreateJob([FromBody] UpsertJobPostingDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var job = await _careerService.CreateJobAsync(dto);
            return Ok(new { success = true, data = job, message = "تمت الإضافة" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPut("jobs/{id}")]
    public async Task<IActionResult> UpdateJob(long id, [FromBody] UpsertJobPostingDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _careerService.UpdateJobAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("jobs/{id}")]
    public async Task<IActionResult> DeleteJob(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _careerService.DeleteJobAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpGet("job-applications")]
    public async Task<IActionResult> GetJobApplications([FromQuery] long? jobId)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _careerService.GetApplicationsAsync(jobId);
        return Ok(new { success = true, data });
    }

    [HttpPut("job-applications/{id}/status")]
    public async Task<IActionResult> UpdateJobApplicationStatus(long id, [FromBody] UpdateJobApplicationStatusDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _careerService.UpdateApplicationStatusAsync(id, dto.Status);
            return Ok(new { success = true, message = "تم تحديث الحالة" });
        }
        catch (InvalidOperationException ex) { return NotFound(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("job-applications/{id}")]
    public async Task<IActionResult> DeleteJobApplication(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _careerService.DeleteApplicationAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    // === Academy (courses) ===
    [HttpGet("courses")]
    public async Task<IActionResult> GetCourses()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _academyService.GetCoursesAsync();
        return Ok(new { success = true, data });
    }

    [HttpPost("courses")]
    public async Task<IActionResult> CreateCourse([FromBody] UpsertAcademyCourseDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var course = await _academyService.CreateCourseAsync(dto);
            return Ok(new { success = true, data = course, message = "تمت الإضافة" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPut("courses/{id}")]
    public async Task<IActionResult> UpdateCourse(long id, [FromBody] UpsertAcademyCourseDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _academyService.UpdateCourseAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("courses/{id}")]
    public async Task<IActionResult> DeleteCourse(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _academyService.DeleteCourseAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpGet("courses/{courseId}/lessons")]
    public async Task<IActionResult> GetCourseLessons(long courseId)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _academyService.GetLessonsAsync(courseId);
        return Ok(new { success = true, data });
    }

    [HttpPost("courses/{courseId}/lessons")]
    public async Task<IActionResult> CreateCourseLesson(long courseId, [FromBody] UpsertAcademyLessonDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var lesson = await _academyService.CreateLessonAsync(courseId, dto);
            return Ok(new { success = true, data = lesson, message = "تمت الإضافة" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpPut("courses/lessons/{id}")]
    public async Task<IActionResult> UpdateCourseLesson(long id, [FromBody] UpsertAcademyLessonDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _academyService.UpdateLessonAsync(id, dto);
            return Ok(new { success = true, message = "تم التحديث" });
        }
        catch (InvalidOperationException ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("courses/lessons/{id}")]
    public async Task<IActionResult> DeleteCourseLesson(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _academyService.DeleteLessonAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    [HttpGet("course-enrollments")]
    public async Task<IActionResult> GetCourseEnrollments([FromQuery] long? courseId)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _academyService.GetEnrollmentsAsync(courseId);
        return Ok(new { success = true, data });
    }

    [HttpPut("course-enrollments/{id}/status")]
    public async Task<IActionResult> UpdateCourseEnrollmentStatus(long id, [FromBody] UpdateAcademyEnrollmentStatusDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _academyService.UpdateEnrollmentStatusAsync(id, dto.Status);
            return Ok(new { success = true, message = "تم تحديث الحالة" });
        }
        catch (InvalidOperationException ex) { return NotFound(new { success = false, message = ex.Message }); }
    }

    [HttpDelete("course-enrollments/{id}")]
    public async Task<IActionResult> DeleteCourseEnrollment(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        await _academyService.DeleteEnrollmentAsync(id);
        return Ok(new { success = true, message = "تم الحذف" });
    }

    // === Store design requests (chat with platform admin) ===
    [HttpGet("design-requests")]
    public async Task<IActionResult> GetDesignRequests()
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _designService.GetRequestsAsync();
        return Ok(new { success = true, data });
    }

    [HttpGet("design-requests/{id}/messages")]
    public async Task<IActionResult> GetDesignRequestMessages(long id)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        var data = await _designService.GetMessagesAsync(id);
        return Ok(new { success = true, data });
    }

    [HttpPost("design-requests/{id}/messages")]
    public async Task<IActionResult> SendDesignRequestMessage(long id, [FromBody] SendStoreDesignMessageDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            var senderName = User.FindFirstValue(ClaimTypes.Name) ?? "الإدارة";
            var message = await _designService.SendMessageAsync(id, "Admin", senderName, dto);
            return Ok(new { success = true, data = message, message = "تم إرسال الرد" });
        }
        catch (InvalidOperationException ex) { return NotFound(new { success = false, message = ex.Message }); }
    }

    [HttpPut("design-requests/{id}/status")]
    public async Task<IActionResult> UpdateDesignRequestStatus(long id, [FromBody] UpdateStoreDesignRequestStatusDto dto)
    {
        var forbidden = CheckSuperAdmin(); if (forbidden != null) return forbidden;
        try
        {
            await _designService.UpdateStatusAsync(id, dto.Status);
            return Ok(new { success = true, message = "تم تحديث الحالة" });
        }
        catch (InvalidOperationException ex) { return NotFound(new { success = false, message = ex.Message }); }
    }
}