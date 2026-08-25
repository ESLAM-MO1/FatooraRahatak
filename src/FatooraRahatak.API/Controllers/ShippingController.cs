using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Shipping;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/shipping")]
[Authorize]
[RequirePackageFeature("HasShippingIntegration")]
public class ShippingController : ControllerBase
{
    private readonly IShippingService _shippingService;
    private readonly IPermissionCheckService _permCheck;
    private readonly AppDbContext _context;

    public ShippingController(IShippingService shippingService, IPermissionCheckService permCheck, AppDbContext context)
    {
        _shippingService = shippingService;
        _permCheck = permCheck;
        _context = context;
    }

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync() => await _permCheck.GetUserStoreIdAsync(GetUserId());

    // ---------- شركات الشحن ----------

    [RequirePermission("ShippingCompanies.View")]
    [HttpGet("companies")]
    public async Task<IActionResult> GetCompanies()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _shippingService.GetCompaniesAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("ShippingCompanies.Add")]
    [HttpPost("companies")]
    public async Task<IActionResult> CreateCompany([FromBody] CreateShippingCompanyDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.CreateCompanyAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تمت إضافة شركة الشحن بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ShippingCompanies.Add")]
    [HttpPost("companies/fetch")]
    public async Task<IActionResult> FetchCompanies()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.FetchCompaniesAsync(storeId.Value);
            return Ok(new
            {
                success = true,
                data = result,
                message = result.Added > 0
                    ? $"تمت إضافة {result.Added} شركة شحن جديدة ({string.Join("، ", result.AddedCompanies)})"
                    : "جميع شركات الشحن المتاحة مضافة بالفعل"
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ShippingCompanies.Edit")]
    [HttpPut("companies/{id}")]
    public async Task<IActionResult> UpdateCompany(long id, [FromBody] UpdateShippingCompanyDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.UpdateCompanyAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث شركة الشحن بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ShippingCompanies.Edit")]
    [HttpDelete("companies/{id}")]
    public async Task<IActionResult> DeleteCompany(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _shippingService.DeleteCompanyAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم حذف شركة الشحن" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ---------- حساب التكلفة ----------

    [RequirePermission("ShippingCompanies.View")]
    [RequirePackageFeature("HasShippingCalculator")]
    [HttpPost("quote")]
    public async Task<IActionResult> GetQuote([FromBody] ShippingQuoteRequestDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.GetQuoteAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    // ---------- الشحنات ----------

    [RequirePermission("ShippingCompanies.Add")]
    [HttpPost("shipments")]
    public async Task<IActionResult> CreateShipment([FromBody] CreateShipmentDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.CreateShipmentAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الشحنة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ShippingCompanies.View")]
    [HttpGet("shipments")]
    public async Task<IActionResult> GetShipments([FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _shippingService.GetShipmentsAsync(storeId.Value, status, page, pageSize);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("ShippingCompanies.View")]
    [HttpGet("shipments/{id}")]
    public async Task<IActionResult> GetShipment(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _shippingService.GetShipmentAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "الشحنة غير موجودة" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("ShippingCompanies.View")]
    [HttpGet("orders/{orderId}/shipment")]
    public async Task<IActionResult> GetShipmentByOrder(long orderId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _shippingService.GetShipmentByOrderAsync(storeId.Value, orderId);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("ShippingCompanies.View")]
    [RequirePackageFeature("HasShippingTracking")]
    [HttpPost("shipments/{id}/sync")]
    public async Task<IActionResult> SyncShipment(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.SyncShipmentAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم تحديث التتبع" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("ShippingCompanies.View")]
    [RequirePackageFeature("HasShippingLabelPrinting")]
    [HttpGet("shipments/{id}/label")]
    public async Task<IActionResult> GetShipmentLabel(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var shipment = await _shippingService.GetShipmentAsync(storeId.Value, id);
        if (shipment == null)
            return NotFound(new { success = false, message = "الشحنة غير موجودة" });

        if (string.IsNullOrWhiteSpace(shipment.LabelUrl))
            return NotFound(new { success = false, message = "البوليصة غير متاحة بعد. حاول مزامنة الشحنة أولًا." });

        return Ok(new { success = true, data = new { labelUrl = shipment.LabelUrl } });
    }

    [RequirePermission("ShippingCompanies.Edit")]
    [HttpPost("shipments/{id}/status")]
    public async Task<IActionResult> UpdateShipmentStatus(long id, [FromBody] UpdateShipmentStatusDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _shippingService.UpdateShipmentStatusAsync(storeId.Value, id, dto);
            if (result == null)
                return NotFound(new { success = false, message = "الشحنة غير موجودة" });

            return Ok(new { success = true, data = result, message = "تم تحديث حالة الشحنة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
