using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores")]
[Authorize]
public class StoreController : ControllerBase
{
    private readonly IStoreService _storeService;
    private readonly IPermissionCheckService _permCheck;

    public StoreController(IStoreService storeService, IPermissionCheckService permCheck)
    {
        _storeService = storeService;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> CreateStore([FromBody] CreateStoreDto dto)
    {
        try
        {
            var result = await _storeService.CreateStoreAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-store")]
    public async Task<IActionResult> GetMyStore()
    {
        var result = await _storeService.GetMyStoreAsync(GetUserId());
        if (result == null)
            return NotFound(new { success = false, message = "لا يوجد متجر مرتبط بحسابك بعد" });

        return Ok(new { success = true, data = result });
    }

    [HttpPut("custom-domain")]
    public async Task<IActionResult> UpdateCustomDomain([FromBody] UpdateCustomDomainDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateCustomDomainAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ الدومين، بانتظار المراجعة والتفعيل" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("return-policy")]
    public async Task<IActionResult> UpdateReturnPolicy([FromBody] UpdateReturnPolicyDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateReturnPolicyAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ سياسة الاسترجاع بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("contact")]
    public async Task<IActionResult> UpdateContact([FromBody] UpdateStoreContactDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateContactAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ بيانات التواصل بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("toggle-online")]
    public async Task<IActionResult> ToggleOnline()
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var isOnline = await _storeService.ToggleStoreOnlineAsync(userId);
            var message = isOnline ? "تم تفعيل المتجر بنجاح" : "تم تعطيل المتجر بنجاح";
            return Ok(new { success = true, data = new { isOnline }, message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("toggle-vat-registration")]
    public async Task<IActionResult> ToggleVatRegistration()
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.ToggleVatRegistrationAsync(userId);
            var message = result.IsVatRegistered
                ? "تم تفعيل التسجيل الضريبي — الفواتير القادمة ستشمل الضريبة"
                : "تم إلغاء التسجيل الضريبي — الفواتير القادمة بدون ضريبة";
            return Ok(new { success = true, data = result, message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("info")]
    public async Task<IActionResult> GetStoreInfo()
    {
        try
        {
            var result = await _storeService.GetStoreInfoAsync(GetUserId());
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("shipping-methods")]
    public async Task<IActionResult> UpdateShippingMethods([FromBody] UpdateShippingMethodsDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateShippingMethodsAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ خيارات الشحن والتوصيل بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("payment-methods")]
    public async Task<IActionResult> UpdatePaymentMethods([FromBody] UpdatePaymentMethodsDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdatePaymentMethodsAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ خيارات الدفع بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
    [HttpPut("social")]
    public async Task<IActionResult> UpdateSocial([FromBody] UpdateStoreSocialDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateSocialInfoAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ روابط التواصل الاجتماعي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("currency-language")]
    public async Task<IActionResult> UpdateCurrencyLanguage([FromBody] UpdateCurrencyLanguageDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateCurrencyLanguageAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ العملة واللغة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("theme")]
    public async Task<IActionResult> GetTheme()
    {
        try
        {
            var result = await _storeService.GetThemeAsync(GetUserId());
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateStoreThemeDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "StoreSettings.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية" }); }
        try
        {
            var result = await _storeService.UpdateThemeAsync(userId, dto);
            return Ok(new { success = true, data = result, message = "تم حفظ القالب والألوان بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateStoreSettings([FromBody] UpdateStoreSettingsDto dto)
    {
        try
        {
            var result = await _storeService.UpdateStoreSettingsAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم حفظ الإعدادات بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}