using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores")]
[Authorize]
public class StoreController : ControllerBase
{
    private readonly IStoreService _storeService;
    private readonly IPermissionCheckService _permCheck;
    private readonly AppDbContext _context;
    private readonly ICustomerNotificationService _customerNotificationService;
    private readonly IStoreDesignService _designService;

    public StoreController(IStoreService storeService, IPermissionCheckService permCheck, AppDbContext context, ICustomerNotificationService customerNotificationService, IStoreDesignService designService)
    {
        _storeService = storeService;
        _permCheck = permCheck;
        _context = context;
        _customerNotificationService = customerNotificationService;
        _designService = designService;
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

    [RequirePermission("StoreSettings.View")]
    [HttpGet("my-store")]
    public async Task<IActionResult> GetMyStore()
    {
        var result = await _storeService.GetMyStoreAsync(GetUserId());
        if (result == null)
            return NotFound(new { success = false, message = "لا يوجد متجر مرتبط بحسابك بعد" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.Edit")]
    [RequirePackageFeature("HasCustomDomain")]
    [HttpPut("custom-domain")]
    public async Task<IActionResult> UpdateCustomDomain([FromBody] UpdateCustomDomainDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("return-policy")]
    public async Task<IActionResult> UpdateReturnPolicy([FromBody] UpdateReturnPolicyDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("contact")]
    public async Task<IActionResult> UpdateContact([FromBody] UpdateStoreContactDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("toggle-online")]
    public async Task<IActionResult> ToggleOnline()
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("toggle-vat-registration")]
    public async Task<IActionResult> ToggleVatRegistration()
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("vat-number")]
    public async Task<IActionResult> UpdateVatNumber([FromBody] UpdateVatNumberDto dto)
    {
        var userId = GetUserId();
        try
        {
            var result = await _storeService.UpdateVatNumberAsync(userId, dto.VatNumber);
            return Ok(new { success = true, data = result, message = "تم حفظ الرقم الضريبي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.View")]
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("shipping-methods")]
    public async Task<IActionResult> UpdateShippingMethods([FromBody] UpdateShippingMethodsDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("payment-methods")]
    public async Task<IActionResult> UpdatePaymentMethods([FromBody] UpdatePaymentMethodsDto dto)
    {
        var userId = GetUserId();
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
    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("social")]
    public async Task<IActionResult> UpdateSocial([FromBody] UpdateStoreSocialDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("currency-language")]
    public async Task<IActionResult> UpdateCurrencyLanguage([FromBody] UpdateCurrencyLanguageDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.View")]
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

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("theme")]
    public async Task<IActionResult> UpdateTheme([FromBody] UpdateStoreThemeDto dto)
    {
        var userId = GetUserId();
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

    [RequirePermission("StoreSettings.Edit")]
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

    [RequirePermission("StoreSettings.Edit")]
    [RequirePackageFeature("HasLogo")]
    [HttpPut("logo")]
    public async Task<IActionResult> UpdateLogo([FromBody] UpdateStoreLogoDto dto)
    {
        try
        {
            var result = await _storeService.UpdateLogoAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم حفظ شعار المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpDelete("logo")]
    public async Task<IActionResult> DeleteLogo()
    {
        try
        {
            var result = await _storeService.DeleteLogoAsync(GetUserId());
            return Ok(new { success = true, data = result, message = "تم إزالة شعار المتجر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [RequirePackageFeature("HasShippingDiscounts")]
    [HttpPut("shipping-discounts")]
    public async Task<IActionResult> UpdateShippingDiscounts([FromBody] UpdateShippingDiscountsDto dto)
    {
        try
        {
            var result = await _storeService.UpdateShippingDiscountsAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم حفظ خصومات الشحن بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("menu-pages")]
    public async Task<IActionResult> UpdateMenuPages([FromBody] UpdateMenuPagesDto dto)
    {
        try
        {
            var result = await _storeService.UpdateMenuPagesAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم حفظ القائمة والسياسات بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPost("send-test-notification")]
    public async Task<IActionResult> SendTestNotification()
    {
        var store = await _context.Stores.FindAsync(await _permCheck.GetUserStoreIdAsync(GetUserId()));
        if (store == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var message = await _customerNotificationService.SendTestNotificationAsync(store);
            return Ok(new { success = true, message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("design-request")]
    public async Task<IActionResult> GetDesignRequest()
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(GetUserId());
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        var request = await _designService.GetOrCreateForStoreAsync(storeId.Value);
        var messages = await _designService.GetMessagesAsync(request.Id);
        return Ok(new { success = true, data = new { request, messages } });
    }

    [HttpPost("design-request/messages")]
    public async Task<IActionResult> SendDesignMessage([FromBody] SendStoreDesignMessageDto dto)
    {
        var storeId = await _permCheck.GetUserStoreIdAsync(GetUserId());
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });
        var request = await _designService.GetOrCreateForStoreAsync(storeId.Value);
        var senderName = User.FindFirstValue(ClaimTypes.Name) ?? "صاحب المتجر";
        var message = await _designService.SendMessageAsync(request.Id, "StoreOwner", senderName, dto);
        return Ok(new { success = true, data = message, message = "تم إرسال رسالتك" });
    }
}