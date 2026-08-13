using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/reports")]
[Authorize]
public class BusinessReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public BusinessReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("Orders.View")]
    [HttpGet("sales")]
    public async Task<IActionResult> GetSales([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetSalesReportAsync(GetUserId(), from, to) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Orders.View")]
    [HttpGet("discounts")]
    public async Task<IActionResult> GetDiscounts([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetDiscountsReportAsync(GetUserId(), from, to) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("FinancialReports.View")]
    [HttpGet("tax")]
    public async Task<IActionResult> GetTax([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetTaxReportAsync(GetUserId(), from, to) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/low-stock")]
    public async Task<IActionResult> GetLowStock([FromQuery] int? threshold)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetLowStockAsync(GetUserId(), threshold) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/movements")]
    public async Task<IActionResult> GetInventoryMovements([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] long? productId)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetInventoryMovementsAsync(GetUserId(), from, to, productId) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/valuation")]
    public async Task<IActionResult> GetInventoryValuation()
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetInventoryValuationAsync(GetUserId()) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Customers.View")]
    [HttpGet("customers/statement")]
    public async Task<IActionResult> GetCustomerStatement([FromQuery] long? customerId, [FromQuery] string? phone, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetCustomerStatementAsync(GetUserId(), customerId, phone, from, to) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("FinancialReports.View")]
    [HttpGet("ar-aging")]
    public async Task<IActionResult> GetARAging()
    {
        try
        {
            return Ok(new { success = true, data = await _reportService.GetARAgingAsync(GetUserId()) });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ---------- ØªØµØ¯ÙŠØ± CSV ----------

    [RequirePermission("Orders.View")]
    [HttpGet("sales/export")]
    public async Task<IActionResult> ExportSales([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var bytes = await _reportService.ExportSalesReportCsvAsync(GetUserId(), from, to);
        return File(bytes, "text/csv", $"sales-report-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("Orders.View")]
    [HttpGet("discounts/export")]
    public async Task<IActionResult> ExportDiscounts([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var bytes = await _reportService.ExportDiscountsReportCsvAsync(GetUserId(), from, to);
        return File(bytes, "text/csv", $"discounts-report-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("FinancialReports.View")]
    [HttpGet("tax/export")]
    public async Task<IActionResult> ExportTax([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var bytes = await _reportService.ExportTaxReportCsvAsync(GetUserId(), from, to);
        return File(bytes, "text/csv", $"tax-report-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/low-stock/export")]
    public async Task<IActionResult> ExportLowStock([FromQuery] int? threshold)
    {
        var bytes = await _reportService.ExportLowStockCsvAsync(GetUserId(), threshold);
        return File(bytes, "text/csv", $"low-stock-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/movements/export")]
    public async Task<IActionResult> ExportInventoryMovements([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] long? productId)
    {
        var bytes = await _reportService.ExportInventoryMovementsCsvAsync(GetUserId(), from, to, productId);
        return File(bytes, "text/csv", $"inventory-movements-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/valuation/export")]
    public async Task<IActionResult> ExportInventoryValuation()
    {
        var bytes = await _reportService.ExportInventoryValuationCsvAsync(GetUserId());
        return File(bytes, "text/csv", $"inventory-valuation-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("Customers.View")]
    [HttpGet("customers/statement/export")]
    public async Task<IActionResult> ExportCustomerStatement([FromQuery] long? customerId, [FromQuery] string? phone, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var bytes = await _reportService.ExportCustomerStatementCsvAsync(GetUserId(), customerId, phone, from, to);
        return File(bytes, "text/csv", $"customer-statement-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    [RequirePermission("FinancialReports.View")]
    [HttpGet("ar-aging/export")]
    public async Task<IActionResult> ExportARAging()
    {
        var bytes = await _reportService.ExportARAgingCsvAsync(GetUserId());
        return File(bytes, "text/csv", $"ar-aging-{DateTime.UtcNow:yyyyMMdd}.csv");
    }
}

