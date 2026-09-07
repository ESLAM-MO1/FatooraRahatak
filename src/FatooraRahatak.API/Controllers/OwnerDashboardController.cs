using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/dashboard")]
[Authorize]
public class OwnerDashboardController : ControllerBase
{
    private readonly IOwnerDashboardService _ownerDashboardService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public OwnerDashboardController(IOwnerDashboardService ownerDashboardService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _ownerDashboardService = ownerDashboardService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Dashboard.View")]
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