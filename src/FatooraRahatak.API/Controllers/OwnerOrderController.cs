using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Orders;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/owner/orders")]
[Authorize]
public class OwnerOrderController : ControllerBase
{
    private readonly IOrderService _orderService;
    private readonly IPaymentService _paymentService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public OwnerOrderController(IOrderService orderService, IPaymentService paymentService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _orderService = orderService;
        _paymentService = paymentService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Orders.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _orderService.GetOwnerOrdersAsync(storeId.Value, status, page, pageSize);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Orders.View")]
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

    [RequirePermission("Products.View")]
    [HttpGet("reviews")]
    public async Task<IActionResult> GetReviews()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var reviews = await _context.ProductReviews
            .Include(r => r.Product)
            .Where(r => r.StoreId == storeId.Value)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new FatooraRahatak.Application.DTOs.Orders.OwnerReviewDto
            {
                Id = r.Id,
                ProductId = r.ProductId,
                ProductName = r.Product != null ? r.Product.NameAr : "—",
                CustomerName = r.CustomerName,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return Ok(new { success = true, data = reviews });
    }

    [RequirePermission("Orders.Edit")]
    [HttpPut("{id}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] UpdateOrderStatusDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            await _orderService.UpdateOrderStatusAsync(storeId.Value, id, userId, dto.NewStatus);
            return Ok(new { success = true, message = "تم تحديث حالة الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Orders.Edit")]
    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelOrder(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            await _orderService.CancelOrderAsync(storeId.Value, id, userId);
            return Ok(new { success = true, message = "تم إلغاء الطلب وإعادة الكميات للمخزون" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ✅ تأكيد التاجر لاستلام الحوالة البنكية → يُعتبر الطلب مدفوعًا وتُطبَّق آثار الدفع
    [RequirePermission("Orders.Edit")]
    [HttpPost("{id}/confirm-bank-transfer")]
    public async Task<IActionResult> ConfirmBankTransfer(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _paymentService.ConfirmBankTransferAsync(storeId.Value, id);
        if (result.Status == "not_found")
            return NotFound(new { success = false, message = result.Message });

        return Ok(new { success = true, data = result, message = result.Message });
    }

    [RequirePermission("Orders.View")]
    [HttpGet("returns")]
    public async Task<IActionResult> GetReturnRequests()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _orderService.GetReturnRequestsAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Orders.Edit")]
    [HttpPost("returns/{returnRequestId}/handle")]
    public async Task<IActionResult> HandleReturnRequest(long returnRequestId, [FromBody] HandleReturnRequestDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var userId = GetUserId();
        try
        {
            await _orderService.HandleReturnRequestAsync(storeId.Value, returnRequestId, dto.Approve, dto.Note, userId);
            return Ok(new { success = true, message = dto.Approve ? "تمت الموافقة على الإرجاع وإعادة المخزون" : "تم رفض طلب الإرجاع" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}