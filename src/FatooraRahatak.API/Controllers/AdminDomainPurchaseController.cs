using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/admin/domain-purchase-requests")]
[Authorize]
public class AdminDomainPurchaseController : ControllerBase
{
    private readonly IDomainPurchaseService _service;

    public AdminDomainPurchaseController(IDomainPurchaseService service)
    {
        _service = service;
    }

    // نفس صلاحيات وحدة Domains الحالية: SuperAdmin أو SupportStaff بدور Admin/Technical
    private IActionResult? CheckAccess()
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        if (role == "SuperAdmin")
            return null;
        if (role != "SupportStaff")
            return Forbid();

        var staffRole = User.FindFirstValue("StaffRole");
        if (staffRole != "Admin" && staffRole != "Technical")
            return Forbid();

        return null;
    }

    private long GetCurrentUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        var data = await _service.GetAllAsync(status);
        return Ok(new { success = true, data });
    }

    [HttpPost("{id}/complete")]
    public async Task<IActionResult> Complete(long id, [FromBody] CompleteDomainPurchaseRequestDto dto)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _service.CompleteAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(long id, [FromBody] RejectDomainPurchaseRequestDto dto)
    {
        var forbidden = CheckAccess();
        if (forbidden != null) return forbidden;
        try
        {
            var data = await _service.RejectAsync(id, GetCurrentUserId(), dto);
            return Ok(new { success = true, data });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
