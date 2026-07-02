using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Inventory;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly AppDbContext _context;

    public InventoryController(IInventoryService inventoryService, AppDbContext context)
    {
        _inventoryService = inventoryService;
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

    [HttpPost("warehouses")]
    public async Task<IActionResult> CreateWarehouse([FromBody] CreateWarehouseDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _inventoryService.CreateWarehouseAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المخزن بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("warehouses")]
    public async Task<IActionResult> GetWarehouses()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetWarehousesAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("inventory/stock")]
    public async Task<IActionResult> GetStock([FromQuery] long? warehouseId, [FromQuery] long? productId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetStockAsync(storeId.Value, warehouseId, productId);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("inventory/transfer")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateStockTransferDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var id = await _inventoryService.CreateStockTransferAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data = new { transferId = id }, message = "تم إنشاء طلب التحويل، بانتظار الاعتماد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("inventory/transfer/{id}/approve")]
    public async Task<IActionResult> ApproveTransfer(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _inventoryService.ApproveStockTransferAsync(storeId.Value, id, GetUserId());
            return Ok(new { success = true, message = "تم اعتماد التحويل وتنفيذه" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("inventory/damage")]
    public async Task<IActionResult> ReportDamage([FromBody] CreateDamagedStockDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var id = await _inventoryService.ReportDamagedStockAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data = new { damageId = id }, message = "تم تسجيل التلف، بانتظار الاعتماد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("inventory/damage/{id}/approve")]
    public async Task<IActionResult> ApproveDamage(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _inventoryService.ApproveDamagedStockAsync(storeId.Value, id, GetUserId());
            return Ok(new { success = true, message = "تم اعتماد التلف وخصم الكمية" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}