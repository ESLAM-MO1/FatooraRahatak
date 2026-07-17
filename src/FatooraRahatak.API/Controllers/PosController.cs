using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/pos")]
[Authorize]
public class PosController : ControllerBase
{
    private readonly IAccountingService _accountingService;
    private readonly IPermissionCheckService _permCheck;
    private readonly AppDbContext _context;

    public PosController(IAccountingService accountingService, IPermissionCheckService permCheck, AppDbContext context)
    {
        _accountingService = accountingService;
        _permCheck = permCheck;
        _context = context;
    }

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet("shifts/current")]
    public async Task<IActionResult> GetCurrentShift()
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == GetUserId());
        if (store == null) return Ok(new { success = true, data = (object?)null });
        var shift = await _context.Set<PosShift>()
            .Include(s => s.OpenedBy)
            .Where(s => s.StoreId == store.Id && s.ClosedAt == null)
            .OrderByDescending(s => s.OpenedAt)
            .FirstOrDefaultAsync();
        if (shift == null) return Ok(new { success = true, data = (object?)null });
        return Ok(new { success = true, data = new PosShiftDto
        {
            Id = shift.Id, StoreId = shift.StoreId, OpenedByName = shift.OpenedBy.FullName,
            OpenedAt = shift.OpenedAt, ClosedAt = shift.ClosedAt, StartingCash = shift.StartingCash,
            EndingCash = shift.EndingCash, TotalSales = shift.TotalSales, IsOpen = shift.IsOpen
        }});
    }

    [HttpGet("shifts/history")]
    public async Task<IActionResult> GetShiftHistory()
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == GetUserId());
        if (store == null) return Ok(new { success = true, data = new List<PosShiftDto>() });
        var shifts = await _context.Set<PosShift>()
            .Include(s => s.OpenedBy)
            .Where(s => s.StoreId == store.Id)
            .OrderByDescending(s => s.OpenedAt).Take(20)
            .Select(s => new PosShiftDto
            {
                Id = s.Id, StoreId = s.StoreId, OpenedByName = s.OpenedBy.FullName,
                OpenedAt = s.OpenedAt, ClosedAt = s.ClosedAt, StartingCash = s.StartingCash,
                EndingCash = s.EndingCash, TotalSales = s.TotalSales, IsOpen = s.IsOpen
            }).ToListAsync();
        return Ok(new { success = true, data = shifts });
    }

    [HttpPost("shifts/open")]
    public async Task<IActionResult> OpenShift([FromBody] OpenShiftDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "POS.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (store == null) return BadRequest(new { success = false, message = "لا يوجد متجر" });

        var openShift = await _context.Set<PosShift>().AnyAsync(s => s.StoreId == store.Id && s.ClosedAt == null);
        if (openShift) return BadRequest(new { success = false, message = "يوجد وردية مفتوحة بالفعل" });

        var shift = new PosShift { StoreId = store.Id, OpenedByUserId = userId, StartingCash = dto.StartingCash };
        _context.Set<PosShift>().Add(shift);
        await _context.SaveChangesAsync();
        return Ok(new { success = true, data = new PosShiftDto { Id = shift.Id, StoreId = shift.StoreId, OpenedByName = (await _context.Users.FindAsync(userId))?.FullName ?? "", OpenedAt = shift.OpenedAt, StartingCash = shift.StartingCash, TotalSales = 0, IsOpen = true }, message = "تم فتح الوردية" });
    }

    [HttpPost("shifts/{id}/close")]
    public async Task<IActionResult> CloseShift(long id, [FromBody] CloseShiftDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "POS.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }

        var shift = await _context.Set<PosShift>().FindAsync(id);
        if (shift == null || shift.ClosedAt != null)
            return BadRequest(new { success = false, message = "الوردية غير موجودة أو مغلقة بالفعل" });

        shift.ClosedAt = DateTime.UtcNow;
        shift.ClosedByUserId = userId;
        shift.EndingCash = dto.EndingCash;
        await _context.SaveChangesAsync();
        return Ok(new { success = true, message = $"تم إغلاق الوردية. إجمالي المبيعات: {shift.TotalSales} ر.س" });
    }

    [HttpPost("sale")]
    public async Task<IActionResult> CreateSale([FromBody] CreatePosSaleDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "POS.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (store != null)
        {
            var openShift = await _context.Set<PosShift>().AnyAsync(s => s.StoreId == store.Id && s.ClosedAt == null);
            if (!openShift) return BadRequest(new { success = false, message = "يجب فتح وردية كاشير أولاً" });
        }

        try
        {
            var result = await _accountingService.CreatePosSaleAsync(userId, dto);
            if (store != null)
            {
                var shift = await _context.Set<PosShift>().FirstOrDefaultAsync(s => s.StoreId == store.Id && s.ClosedAt == null);
                if (shift != null) { shift.TotalSales += result.TotalAmount; await _context.SaveChangesAsync(); }
            }
            return Ok(new { success = true, data = result, message = "تمت عملية البيع بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
