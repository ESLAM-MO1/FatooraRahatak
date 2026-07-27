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

    private IActionResult CheckSuperAdmin()
    {
        if (!IsSuperAdmin())
            return Forbid();
        return null!;
    }

    [HttpGet]
    public async Task<IActionResult> GetKpis()
    {
        var forbidden = CheckSuperAdmin();
        if (forbidden != null) return forbidden;
        var data = await _kpiService.GetKpiDashboardAsync();
        return Ok(new { success = true, data });
    }
}
