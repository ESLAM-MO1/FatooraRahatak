using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/vouchers")]
[Authorize]
public class VouchersController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;

    public VouchersController(IAccountingService accountingService, IPermissionCheckService permCheck)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("receipt")]
    public async Task<IActionResult> CreateReceiptVoucher([FromBody] CreateVoucherDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Vouchers.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.CreateReceiptVoucherAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء سند القبض بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("payment")]
    public async Task<IActionResult> CreatePaymentVoucher([FromBody] CreateVoucherDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Vouchers.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.CreatePaymentVoucherAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء سند الصرف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetVouchers([FromQuery] string? voucherType, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var result = await _accountingService.GetVouchersAsync(GetUserId(), voucherType, from, to);
        return Ok(new { success = true, data = result });
    }
}