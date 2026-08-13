using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/accounts")]
[Authorize]
[RequirePackageFeature("HasAccountingFull")]
public class AccountingController : ControllerBase
{
    private readonly IAccountingService _accountingService;

    public AccountingController(IAccountingService accountingService)
    {
        _accountingService = accountingService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("ChartOfAccounts.View")]
    [HttpGet]
    public async Task<IActionResult> GetAccounts()
    {
        var result = await _accountingService.GetAccountsTreeAsync(GetUserId());
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("ChartOfAccounts.Add")]
    [HttpPost]
    public async Task<IActionResult> CreateAccount([FromBody] CreateAccountDto dto)
    {
        try
        {
            var result = await _accountingService.CreateAccountAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الحساب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ChartOfAccounts.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateAccount(long id, [FromBody] UpdateAccountDto dto)
    {
        try
        {
            var result = await _accountingService.UpdateAccountAsync(GetUserId(), id, dto);
            return Ok(new { success = true, data = result, message = "تم تعديل الحساب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ChartOfAccounts.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteAccount(long id)
    {
        try
        {
            await _accountingService.DeleteAccountAsync(GetUserId(), id);
            return Ok(new { success = true, message = "تم حذف الحساب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ⚠️ جديد (تاسك 5): دفتر الأستاذ العام لحساب واحد
    // GET /api/v1/accounts/{id}/ledger?from=2026-01-01&to=2026-01-31
    [RequirePermission("Ledger.View")]
    [HttpGet("{id}/ledger")]
    public async Task<IActionResult> GetAccountLedger(long id, [FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        try
        {
            var result = await _accountingService.GetAccountLedgerAsync(GetUserId(), id, from, to);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}