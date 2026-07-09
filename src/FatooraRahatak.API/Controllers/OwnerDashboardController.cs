using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/dashboard")]
[Authorize]
public class OwnerDashboardController : ControllerBase
{
    private readonly IOwnerDashboardService _ownerDashboardService;
    private readonly AppDbContext _context;

    public OwnerDashboardController(IOwnerDashboardService ownerDashboardService, AppDbContext context)
    {
        _ownerDashboardService = ownerDashboardService;
        _context = context;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] string period = "daily")
    {
        if (period != "daily" && period != "monthly" && period != "yearly")
            return BadRequest(new { success = false, message = "الفترة غير صحيحة، القيم المسموحة: daily, monthly, yearly" });

        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _ownerDashboardService.GetStatsAsync(storeId.Value, period);
        return Ok(new { success = true, data = result });
    }
}