using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Application.DTOs.Customers;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;
using Microsoft.EntityFrameworkCore;

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

    // 📦 الموردون: قائمة موحّدة مستخلصة من فواتير المشتريات (InvoiceType.Purchase)
    [RequirePermission("Customers.View")]
    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var suppliers = await _context.Set<Invoice>()
            .Where(i => i.StoreId == storeId.Value && i.InvoiceType == InvoiceType.Purchase && i.PartyName != null)
            .GroupBy(i => new { i.PartyName, i.PartyPhone, i.PartyCity })
            .Select(g => new
            {
                name = g.Key.PartyName,
                phone = g.Key.PartyPhone,
                city = g.Key.PartyCity,
                invoicesCount = g.Count(),
                totalPurchases = g.Sum(i => i.TotalAmount)
            })
            .OrderBy(s => s.name)
            .ToListAsync();

        return Ok(new { success = true, data = suppliers });
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