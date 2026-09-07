using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Settlement;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
public class SettlementController : ControllerBase
{
    private readonly ISettlementService _settlementService;
    private readonly IPermissionCheckService _permCheck;

    public SettlementController(ISettlementService settlementService, IPermissionCheckService permCheck)
    {
        _settlementService = settlementService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private bool IsSuperAdmin() =>
        User.FindFirstValue(ClaimTypes.Role) == "SuperAdmin";

    // ===================== إدارة المنصة (SuperAdmin) =====================

    [Route("api/v1/admin/settlements/batches")]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetBatches([FromQuery] string? status)
    {
        if (!IsSuperAdmin()) return Forbid();
        var result = await _settlementService.GetSettlementBatchesAsync(status);
        return Ok(new { success = true, data = result });
    }

    [Route("api/v1/admin/settlements/batches/generate")]
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> GenerateBatch([FromBody] GenerateSettlementBatchDto? dto)
    {
        if (!IsSuperAdmin()) return Forbid();
        try
        {
            var result = await _settlementService.GenerateSettlementBatchAsync(dto?.PeriodEnd);
            return Ok(new { success = true, data = result, message = "تم إنشاء دفعة التسوية بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [Route("api/v1/admin/settlements/batches/{id}")]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetBatchDetail(long id)
    {
        if (!IsSuperAdmin()) return Forbid();
        var result = await _settlementService.GetSettlementBatchDetailAsync(id);
        if (result == null)
            return NotFound(new { success = false, message = "دفعة التسوية غير موجودة" });
        return Ok(new { success = true, data = result });
    }

    [Route("api/v1/admin/settlements/batches/{id}/confirm")]
    [Authorize]
    [HttpPost]
    public async Task<IActionResult> ConfirmBatch(long id, [FromBody] ConfirmSettlementDto? dto)
    {
        if (!IsSuperAdmin()) return Forbid();
        try
        {
            var result = await _settlementService.ConfirmSettlementAsync(id, GetUserId(), dto?.PaymentReference);
            if (result == null)
                return NotFound(new { success = false, message = "دفعة التسوية غير موجودة" });
            return Ok(new { success = true, data = result, message = "تم تأكيد تحويل التسوية وترحيل القيود المحاسبية" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ===================== لوحة التاجر =====================

    [Route("api/v1/owner/settlements")]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetMerchantSettlement()
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(GetUserId());
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _settlementService.GetMerchantSettlementSummaryAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [Route("api/v1/owner/settlements/bank-details")]
    [Authorize]
    [HttpGet]
    public async Task<IActionResult> GetBankDetails()
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(GetUserId());
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _settlementService.GetMerchantBankDetailsAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [Route("api/v1/owner/settlements/bank-details")]
    [Authorize]
    [HttpPut]
    public async Task<IActionResult> SaveBankDetails([FromBody] SaveMerchantBankDetailsDto dto)
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(GetUserId());
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _settlementService.SaveMerchantBankDetailsAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ بيانات الحساب البنكي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
