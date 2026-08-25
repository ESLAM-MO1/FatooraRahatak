using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Zatca;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/zatca")]
[Authorize]
public class ZatcaController : ControllerBase
{
    private readonly IZatcaService _zatcaService;
    private readonly IPermissionCheckService _permCheck;

    public ZatcaController(IZatcaService zatcaService, IPermissionCheckService permCheck)
    {
        _zatcaService = zatcaService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [HttpGet("status")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> GetStatus()
    {
        var result = await _zatcaService.GetStatusAsync();
        return Ok(new { success = true, data = result });
    }

    [HttpGet("credential")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> GetCredential()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _zatcaService.GetCredentialAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("onboard")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> Onboard([FromBody] ZatcaOnboardDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _zatcaService.OnboardAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الجهاز بنجاح لدى زاتكا واعتماد شهادة CSID" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("invoices/{invoiceId}/submit")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> SubmitInvoice(long invoiceId, [FromBody] ZatcaSubmitInvoiceDto? dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _zatcaService.SubmitInvoiceAsync(
                storeId.Value,
                GetUserId(),
                invoiceId,
                dto?.ForceReporting ?? false,
                dto?.BuyerVatNumber);
            return Ok(new { success = result.Success, data = result, message = result.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("invoices/{invoiceId}")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> GetInvoiceStatus(long invoiceId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _zatcaService.GetInvoiceStatusAsync(storeId.Value, invoiceId);
        if (result == null) return NotFound(new { success = false, message = "الفاتورة غير موجودة" });
        return Ok(new { success = true, data = result });
    }

    [HttpPost("invoices/{invoiceId}/verify")]
    [RequirePackageFeature("HasZatcaInvoice")]
    public async Task<IActionResult> VerifyInvoice(long invoiceId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _zatcaService.VerifyInvoiceAsync(storeId.Value, invoiceId);
            return Ok(new { success = true, data = result, message = result.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
