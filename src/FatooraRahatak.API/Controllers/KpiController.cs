using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/admin/kpis")]
[Authorize]
public class KpiController : ControllerBase
{
    private readonly IKpiService _kpiService;

    public KpiController(IKpiService kpiService)
    {
        _kpiService = kpiService;
    }

    private bool IsSuperAdmin()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        return role == "SuperAdmin";
    }

    // KPI dashboard is part of the Reports module - same access rule as
    // AdminController's "Reports" module (SuperAdmin, or staff with Admin/Finance role).
    private IActionResult? CheckAccess()
    {
        if (IsSuperAdmin())
            return null;

        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role != "SupportStaff")
            return Forbid();

        var staffRole = User.FindFirstValue("StaffRole");
        if (staffRole != "Admin" && staffRole != "Finance")
            return Forbid();

        return null;
    }

    [HttpGet]
    public async Task<IActionResult> GetKpis()
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        var data = await _kpiService.GetKpiDashboardAsync();
        return Ok(new { success = true, data });
    }
}