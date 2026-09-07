using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/verification")]
[Authorize]
public class MerchantVerificationController : ControllerBase
{
    private readonly IMerchantVerificationService _verificationService;
    private readonly IPermissionCheckService _permCheck;

    public MerchantVerificationController(IMerchantVerificationService verificationService, IPermissionCheckService permCheck)
    {
        _verificationService = verificationService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    /// <summary>
    /// هل المستخدم أدمن بصلاحية SupportOps (أو SuperAdmin) — يُسمح له بتحميل مستندات أي تاجر؟
    /// نفس منطق ModuleAccess["SupportOps"] في AdminController.
    /// </summary>
    private bool IsSupportOpsAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "SuperAdmin") return true;
        if (role != "SupportStaff") return false;

        var staffRole = User.FindFirstValue("StaffRole");
        return staffRole == "Admin" || staffRole == "Support";
    }

    [HttpGet("documents/{documentId}/file")]
    public async Task<IActionResult> GetDocumentFile(long documentId)
    {
        var doc = await _verificationService.GetDocumentFileAsync(documentId);
        if (doc == null)
            return NotFound(new { success = false, message = "المستند غير موجود" });

        if (!IsSupportOpsAdmin())
        {
            var storeId = await GetStoreIdAsync();
            if (storeId == null || doc.StoreId != storeId.Value)
                return Forbid();
        }

        if (!doc.FileExists)
            return NotFound(new { success = false, message = "ملف المستند غير موجود" });

        return PhysicalFile(doc.AbsolutePath, doc.ContentType);
    }

    [HttpGet]
    public async Task<IActionResult> GetMyVerification()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var data = await _verificationService.GetMyVerificationAsync(storeId.Value);
        return Ok(new { success = true, data });
    }

    [HttpPost("documents")]
    public async Task<IActionResult> UploadDocument(IFormFile file, [FromForm] string documentType)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var data = await _verificationService.SubmitDocumentsAsync(storeId.Value, GetUserId(), file.OpenReadStream(), file.FileName, documentType);
            return Ok(new { success = true, data, message = "تم رفع المستند بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("documents/{documentId}")]
    public async Task<IActionResult> RemoveDocument(long documentId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var data = await _verificationService.RemoveDocumentAsync(storeId.Value, documentId);
            return Ok(new { success = true, data, message = "تم حذف المستند" });
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
            var data = await _verificationService.SubmitForReviewAsync(storeId.Value);
            return Ok(new { success = true, data, message = "تم إرسال التوثيق للمراجعة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}