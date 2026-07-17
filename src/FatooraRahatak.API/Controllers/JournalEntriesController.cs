using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/journal-entries")]
[Authorize]
public class JournalEntriesController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;

    public JournalEntriesController(IAccountingService accountingService, IPermissionCheckService permCheck)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetJournalEntries(
        [FromQuery] string? status,
        [FromQuery] DateOnly? from,
        [FromQuery] DateOnly? to)
    {
        try
        {
            var result = await _accountingService.GetJournalEntriesAsync(GetUserId(), status, from, to);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetJournalEntryById(long id)
    {
        try
        {
            var result = await _accountingService.GetJournalEntryByIdAsync(GetUserId(), id);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> CreateJournalEntry([FromBody] CreateJournalEntryDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "JournalEntries.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.CreateJournalEntryAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء القيد بنجاح، بانتظار الاعتماد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveJournalEntry(long id)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "JournalEntries.Approve"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.ApproveJournalEntryAsync(userId, id);
            return Ok(new { success = true, data = result, message = "تم اعتماد القيد بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectJournalEntry(long id)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "JournalEntries.Approve"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _accountingService.RejectJournalEntryAsync(userId, id);
            return Ok(new { success = true, data = result, message = "تم رفض القيد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/reverse")]
    public async Task<IActionResult> ReverseJournalEntry(long id)
    {
        try
        {
            var result = await _accountingService.ReverseJournalEntryAsync(GetUserId(), id);
            return Ok(new { success = true, data = result, message = "تم إنشاء قيد عكسي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}