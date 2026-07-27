using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/payments")]
[Authorize]
public class OwnerPaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public OwnerPaymentController(IPaymentService paymentService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _paymentService = paymentService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try { await _permCheck.EnsurePermissionAsync(GetUserId(), "Payments.View"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }

        try
        {
            var result = await _paymentService.GetPaymentsAsync(storeId.Value, status);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
