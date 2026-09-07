using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/invoices")]
[Authorize]
[RequirePackageFeature("HasAccountingFull")]
public class InvoicesController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;
    private readonly IPdfService _pdfService;

    public InvoicesController(IAccountingService accountingService, IPermissionCheckService permCheck, IPdfService pdfService)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
        _pdfService = pdfService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("Invoices.Add")]
    [HttpPost("sales")]
    public async Task<IActionResult> CreateSalesInvoice([FromBody] CreateSalesInvoiceDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("Invoices.Add")]
    [HttpPost("purchase")]
    public async Task<IActionResult> CreatePurchaseInvoice([FromBody] CreatePurchaseInvoiceDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("Invoices.View")]
    [HttpGet]
    public async Task<IActionResult> GetInvoices([FromQuery] string? invoiceType, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try
        {
            var result = await _accountingService.GetInvoicesAsync(GetUserId(), invoiceType, from, to, page, pageSize);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Invoices.View")]
    [HttpGet("{id:long}")]
    public async Task<IActionResult> GetInvoice(long id)
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

    [RequirePermission("Invoices.View")]
    [HttpGet("{id:long}/pdf")]
    public async Task<IActionResult> GetInvoicePdf(long id)
    {
        try
        {
            var result = await _accountingService.GetInvoiceByIdAsync(GetUserId(), id);
            var pdf = _pdfService.GenerateInvoicePdf(result);
            return File(pdf, "application/pdf", $"invoice-{result.InvoiceNumber}.pdf");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}