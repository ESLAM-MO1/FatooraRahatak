using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/customers")]
[Authorize]
public class OwnerCustomerController : ControllerBase
{
    private readonly IOwnerCustomerService _ownerCustomerService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public OwnerCustomerController(IOwnerCustomerService ownerCustomerService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _ownerCustomerService = ownerCustomerService;
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
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try { await _permCheck.EnsurePermissionAsync(GetUserId(), "Customers.View"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        var result = await _ownerCustomerService.GetOwnerCustomersAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("{identifier}")]
    public async Task<IActionResult> GetByIdentifier(string identifier)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try { await _permCheck.EnsurePermissionAsync(GetUserId(), "Customers.View"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        var result = await _ownerCustomerService.GetOwnerCustomerDetailAsync(storeId.Value, identifier);
        if (result == null)
            return NotFound(new { success = false, message = "العميل غير موجود" });

        return Ok(new { success = true, data = result });
    }
}