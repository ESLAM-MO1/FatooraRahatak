using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Text.Json;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public SubscriptionController(ISubscriptionService subscriptionService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _subscriptionService = subscriptionService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("SubscriptionPackage.View")]
    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _subscriptionService.GetStatusAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("SubscriptionPackage.View")]
    [HttpGet("payment-methods")]
    public async Task<IActionResult> GetPaymentMethods()
    {
        // حساب المنصة البنكي للتحويل البنكي (من PlatformSettings أو appsettings أو default)
        BankTransferInfoDto? bankAccount = null;
        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "platform_bank_account");
        if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
        {
            try
            {
                using var doc = JsonDocument.Parse(setting.SettingValue);
                var root = doc.RootElement;
                var iban = root.TryGetProperty("iban", out var ib) ? ib.GetString() : null;
                var bankName = root.TryGetProperty("bankName", out var bn) ? bn.GetString() : null;
                var holder = root.TryGetProperty("accountHolder", out var ah) ? ah.GetString() : null;
                // تجاهل القيمة التالفة/المشوّهة
                if (!string.IsNullOrWhiteSpace(iban) && !iban.Contains('?')
                    && bankName?.Contains('?') == false && holder?.Contains('?') == false)
                {
                    bankAccount = new BankTransferInfoDto
                    {
                        BankName = bankName,
                        AccountHolder = holder,
                        Iban = iban
                    };
                }
            }
            catch { }
        }

        // Fallback: قيمة افتراضية نظيفة
        if (bankAccount == null)
        {
            bankAccount = new BankTransferInfoDto
            {
                BankName = "البنك الأهلي السعودي",
                AccountHolder = "فاتورة راحتك",
                Iban = "SA0000000000000000000000"
            };
        }

        return Ok(new
        {
            success = true,
            data = new
            {
                onlinePayment = true,
                bankTransfer = true,
                bankAccount
            }
        });
    }

    [RequirePermission("SubscriptionPackage.Edit")]
    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] ChangePackageDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _subscriptionService.UpgradeAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تمت الترقية بنجاح", data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("SubscriptionPackage.Edit")]
    [HttpPost("downgrade")]
    public async Task<IActionResult> Downgrade([FromBody] ChangePackageDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _subscriptionService.DowngradeAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تم التنزيل بنجاح", data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("SubscriptionPackage.Edit")]
    [HttpPost("renew")]
    public async Task<IActionResult> Renew([FromBody] ChangePackageDto? dto = null)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _subscriptionService.RenewAsync(storeId.Value, dto?.BillingCycle ?? Domain.Enums.BillingCycle.Monthly);
            return Ok(new { success = true, message = "تم تجديد الاشتراك بنجاح", data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("SubscriptionPackage.Edit")]
    [HttpPost("cancel")]
    public async Task<IActionResult> Cancel()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _subscriptionService.CancelAsync(storeId.Value);
            return Ok(new { success = true, message = "تم إلغاء التجديد التلقائي، سيبقى المتجر نشطًا حتى نهاية فترة السماح (7 أيام) بعد انتهاء الاشتراك الحالي" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}