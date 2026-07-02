using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/subscriptions")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly AppDbContext _context;

    public SubscriptionController(ISubscriptionService subscriptionService, AppDbContext context)
    {
        _subscriptionService = subscriptionService;
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

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _subscriptionService.GetStatusAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("upgrade")]
    public async Task<IActionResult> Upgrade([FromBody] ChangePackageDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _subscriptionService.UpgradeAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تمت الترقية بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("downgrade")]
    public async Task<IActionResult> Downgrade([FromBody] ChangePackageDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _subscriptionService.DowngradeAsync(storeId.Value, dto);
            return Ok(new { success = true, message = "تم التنزيل بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("renew")]
    public async Task<IActionResult> Renew()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _subscriptionService.RenewAsync(storeId.Value);
            return Ok(new { success = true, message = "تم تجديد الاشتراك بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

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