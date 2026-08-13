using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

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

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Payments.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _paymentService.GetPaymentsAsync(storeId.Value, status, page, pageSize);
            return Ok(new { success = true, data = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Payments.View")]
    [HttpGet("account")]
    public async Task<IActionResult> GetAccount()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _paymentService.GetStorePaymentAccountAsync(storeId.Value);
        if (result == null) return NotFound(new { success = false, message = "المتجر غير موجود" });
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Payments.Edit")]
    [HttpPost("account")]
    public async Task<IActionResult> SubmitAccount([FromBody] SubmitStorePaymentAccountDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _paymentService.SubmitStorePaymentAccountAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إرسال بيانات حساب الدفع للمراجعة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Payments.View")]
    [HttpPost("refund")]
    public async Task<IActionResult> Refund([FromBody] RefundPaymentDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _paymentService.RefundPaymentAsync(storeId.Value, dto.PaymentReference);
            if (result.Status == "not_found")
                return NotFound(new { success = false, message = result.Message });

            if (result.Status != "Refunded")
                return BadRequest(new { success = false, message = result.Message });

            return Ok(new { success = true, data = result, message = "تم استرداد الدفعة بنجاح" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }
}
