using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Orders;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/orders")]
[Authorize]
public class OwnerOrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly AppDbContext _context;

    public OwnerOrderController(IOrderService orderService, AppDbContext context)
    {
        _orderService = orderService;
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

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _orderService.GetOwnerOrdersAsync(storeId.Value, status);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _orderService.GetOwnerOrderDetailAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "الطلب غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateOrderStatusDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _orderService.UpdateOrderStatusAsync(storeId.Value, id, GetUserId(), dto.NewStatus);
            return Ok(new { success = true, message = "تم تحديث حالة الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}