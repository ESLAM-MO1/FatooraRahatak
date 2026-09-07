using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Inventory;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stock-counts")]
[Authorize]
public class StockCountController : ControllerBase
{
    private readonly IStockCountService _stockCountService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public StockCountController(IStockCountService stockCountService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _stockCountService = stockCountService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("StockCounts.Add")]
    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartStockCountDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _stockCountService.StartAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم بدء الجرد بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StockCounts.Edit")]
    [HttpPut("submit-count")]
    public async Task<IActionResult> SubmitCount([FromBody] SubmitCountedQuantityDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _stockCountService.SubmitCountedQuantityAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تم حفظ الكمية بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StockCounts.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _stockCountService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StockCounts.View")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _stockCountService.GetByIdAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "الجرد غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StockCounts.Approve")]
    [HttpPut("{id}/approve")]
    public async Task<IActionResult> Approve(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _stockCountService.ApproveAsync(storeId.Value, id, GetUserId());
            var result = await _stockCountService.GetByIdAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم اعتماد الجرد بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ❌ إلغاء جرد قيد التنفيذ (InProgress) → يُغيّر حالته إلى Cancelled
    // ويُحرّر المخزن لبدء جرد جديد فورًا (يُصلح الجرد العالق الذي لا يمكن إنهاؤه).
    [RequirePermission("StockCounts.Approve")]
    [HttpPut("{id}/cancel")]
    public async Task<IActionResult> Cancel(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _stockCountService.CancelAsync(storeId.Value, id);
            var result = await _stockCountService.GetByIdAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم إلغاء الجرد بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
