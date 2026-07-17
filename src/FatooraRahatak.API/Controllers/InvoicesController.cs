using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;

    public InvoicesController(IAccountingService accountingService, IPermissionCheckService permCheck)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost("sales")]
    public async Task<IActionResult> CreateSalesInvoice([FromBody] CreateSalesInvoiceDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Invoices.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.CreateSalesInvoiceAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء فاتورة البيع بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("purchase")]
    public async Task<IActionResult> CreatePurchaseInvoice([FromBody] CreatePurchaseInvoiceDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Invoices.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.CreatePurchaseInvoiceAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء فاتورة الشراء بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? invoiceType, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var result = await _accountingService.GetInvoicesAsync(GetUserId(), invoiceType, from, to);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetInvoiceById(long id)
    {
        try
        {
            var result = await _accountingService.GetInvoiceByIdAsync(GetUserId(), id);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}