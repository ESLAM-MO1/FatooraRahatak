using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Application.DTOs.Customers;
using FatooraRahatak.Domain.Entities.Customers;
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

    // 📦 الموردون: دمج بين الموردين المسجّلين فعليًا وبين أسماء مستخلصة من فواتير مشتريات قديمة (Legacy)
    [RequirePermission("Customers.View")]
    [HttpGet("suppliers")]
    public async Task<IActionResult> GetSuppliers()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var registered = await _context.Set<Supplier>()
            .Where(s => s.StoreId == storeId.Value)
            .ToListAsync();

        var invoiceStats = await _context.Set<Invoice>()
            .Where(i => i.StoreId == storeId.Value && i.InvoiceType == InvoiceType.Purchase && i.PartyName != null)
            .GroupBy(i => i.PartyName)
            .Select(g => new
            {
                name = g.Key!,
                phone = g.Max(i => i.PartyPhone),
                city = g.Max(i => i.PartyCity),
                invoicesCount = g.Count(),
                totalPurchases = g.Sum(i => i.TotalAmount)
            })
            .ToListAsync();

        var registeredResult = registered.Select(s =>
        {
            var stat = invoiceStats.FirstOrDefault(x => x.name == s.FullName);
            return new
            {
                id = (long?)s.Id,
                name = s.FullName,
                phone = s.Phone,
                city = s.City,
                invoicesCount = stat?.invoicesCount ?? 0,
                totalPurchases = stat?.totalPurchases ?? 0m
            };
        });

        var registeredNames = registered.Select(s => s.FullName).ToHashSet();
        var legacyResult = invoiceStats
            .Where(x => !registeredNames.Contains(x.name))
            .Select(x => new
            {
                id = (long?)null,
                name = x.name,
                phone = x.phone,
                city = x.city,
                invoicesCount = x.invoicesCount,
                totalPurchases = x.totalPurchases
            });

        var suppliers = registeredResult.Concat(legacyResult).OrderBy(s => s.name).ToList();

        return Ok(new { success = true, data = suppliers });
    }

    [RequirePermission("Customers.Add")]
    [HttpPost("suppliers")]
    public async Task<IActionResult> CreateSupplier([FromBody] CreateSupplierDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { success = false, message = "اسم المورد مطلوب" });

        var supplier = new Supplier
        {
            StoreId = storeId.Value,
            FullName = dto.FullName.Trim(),
            Phone = string.IsNullOrWhiteSpace(dto.Phone) ? null : dto.Phone.Trim(),
            City = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim()
        };

        _context.Add(supplier);
        await _context.SaveChangesAsync();

        return Ok(new { success = true, data = supplier, message = "تم إضافة المورد بنجاح" });
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