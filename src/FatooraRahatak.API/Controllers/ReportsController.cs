using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/accounting/reports")]
[Authorize]
[RequirePackageFeature("HasAccountingFull")]
public class ReportsController : ControllerBase
{
    private readonly IAccountingService _accountingService;

    public ReportsController(IAccountingService accountingService)
    {
        _accountingService = accountingService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("FinancialReports.View")]
    [HttpGet("trial-balance")]
    public async Task<IActionResult> GetTrialBalance([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? accountType, [FromQuery] string? sourceType)
    {
        try
        {
            var result = await _accountingService.GetTrialBalanceAsync(GetUserId(), from, to, accountType, sourceType);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [RequirePermission("FinancialReports.View")]
    [HttpGet("income-statement")]
    public async Task<IActionResult> GetIncomeStatement([FromQuery] DateOnly? from, [FromQuery] DateOnly? to, [FromQuery] string? accountType, [FromQuery] string? sourceType)
    {
        try
        {
            var result = await _accountingService.GetIncomeStatementAsync(GetUserId(), from, to, accountType, sourceType);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [RequirePermission("FinancialReports.View")]
    [HttpGet("balance-sheet")]
    public async Task<IActionResult> GetBalanceSheet([FromQuery] DateOnly? asOf)
    {
        try
        {
            var effectiveDate = asOf ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var result = await _accountingService.GetBalanceSheetAsync(GetUserId(), effectiveDate);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [RequirePermission("FinancialReports.View")]
    [HttpGet("cash-flow")]
    public async Task<IActionResult> GetCashFlow([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            var result = await _accountingService.GetCashFlowAsync(GetUserId(), from, to);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
