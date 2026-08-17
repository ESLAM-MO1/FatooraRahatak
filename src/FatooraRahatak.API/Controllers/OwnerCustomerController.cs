using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Application.DTOs.Customers;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

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

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Customers.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _ownerCustomerService.GetOwnerCustomersAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Customers.View")]
    [HttpGet("{identifier}")]
    public async Task<IActionResult> GetByIdentifier(string identifier)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _ownerCustomerService.GetOwnerCustomerDetailAsync(storeId.Value, identifier);
        if (result == null)
            return NotFound(new { success = false, message = "العميل غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Customers.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStoreCustomerDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _ownerCustomerService.CreateStoreCustomerAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إضافة العميل بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}