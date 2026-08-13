using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Inventory;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventoryService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public InventoryController(IInventoryService inventoryService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _inventoryService = inventoryService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Warehouses.Add")]
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

    [RequirePermission("Warehouses.View")]
    [HttpGet("warehouses")]
    public async Task<IActionResult> GetWarehouses()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetWarehousesAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Inventory.View")]
    [HttpGet("inventory/stock")]
    public async Task<IActionResult> GetStock([FromQuery] long? warehouseId, [FromQuery] long? productId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetStockAsync(storeId.Value, warehouseId, productId);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StockTransfer.Add")]
    [HttpPost("inventory/transfer")]
    public async Task<IActionResult> CreateTransfer([FromBody] CreateStockTransferDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            var id = await _inventoryService.CreateStockTransferAsync(storeId.Value, userId, dto);
            return Ok(new { success = true, data = new { transferId = id }, message = "تم إنشاء طلب التحويل، بانتظار الاعتماد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StockTransfer.Approve")]
    [HttpPut("inventory/transfer/{id}/approve")]
    public async Task<IActionResult> ApproveTransfer(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            await _inventoryService.ApproveStockTransferAsync(storeId.Value, id, userId);
            return Ok(new { success = true, message = "تم اعتماد التحويل وتنفيذه" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("DamagedStock.Add")]
    [HttpPost("inventory/damage")]
    public async Task<IActionResult> ReportDamage([FromBody] CreateDamagedStockDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            var id = await _inventoryService.ReportDamagedStockAsync(storeId.Value, userId, dto);
            return Ok(new { success = true, data = new { damageId = id }, message = "تم تسجيل التلف، بانتظار الاعتماد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("DamagedStock.Approve")]
    [HttpPut("inventory/damage/{id}/approve")]
    public async Task<IActionResult> ApproveDamage(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            await _inventoryService.ApproveDamagedStockAsync(storeId.Value, id, userId);
            return Ok(new { success = true, message = "تم اعتماد التلف وخصم الكمية" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StockTransfer.View")]
    [HttpGet("inventory/transfers")]
    public async Task<IActionResult> GetTransfers()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetStockTransfersAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("DamagedStock.View")]
    [HttpGet("inventory/damages")]
    public async Task<IActionResult> GetDamages()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _inventoryService.GetDamagedStocksAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }
}