using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Application.DTOs.Merchant;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/merchant-account")]
[Authorize]
public class MerchantAccountController : ControllerBase
{
    private readonly IMerchantAccountService _accountService;
    private readonly IPermissionCheckService _permCheck;

    public MerchantAccountController(IMerchantAccountService accountService, IPermissionCheckService permCheck)
    {
        _accountService = accountService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [HttpGet]
    public async Task<IActionResult> GetMyAccount()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var data = await _accountService.GetByStoreAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [HttpPut]
    public async Task<IActionResult> Upsert(UpsertMerchantAccountDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var data = await _accountService.UpsertAsync(storeId.Value, dto);
            return Ok(new { success = true, data, message = "تم حفظ حساب التاجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("logo")]
    public async Task<IActionResult> UploadLogo(IFormFile file)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (ext != ".png" && ext != ".jpg" && ext != ".jpeg")
                return BadRequest(new { success = false, message = "صيغة الملف غير مدعومة. استخدم PNG أو JPG" });

            if (file.Length > 2 * 1024 * 1024)
                return BadRequest(new { success = false, message = "حجم الملف يتجاوز 2 ميجابايت" });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads", "merchant-accounts");
            Directory.CreateDirectory(uploadsDir);

            var uploadFileName = $"{Guid.NewGuid()}{ext}";
            var filePath = Path.Combine(uploadsDir, uploadFileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var relative = $"/uploads/merchant-accounts/{uploadFileName}";
            var data = await _accountService.UpdateLogoAsync(storeId.Value, relative);
            return Ok(new { success = true, data, message = "تم رفع اللوجو بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("submit")]
    public async Task<IActionResult> SubmitForReview()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var data = await _accountService.MarkSubmittedAsync(storeId.Value);
            return Ok(new { success = true, data, message = "تم إرسال حساب التاجر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}