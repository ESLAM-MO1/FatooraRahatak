using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Sales;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/coupons")]
[Authorize]
public class CouponController : ControllerBase
{
    private readonly ICouponService _couponService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public CouponController(ICouponService couponService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _couponService = couponService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Coupons.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCouponDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _couponService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الكوبون بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Coupons.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _couponService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Coupons.Edit")]
    [HttpPut("{id}/deactivate")]
    public async Task<IActionResult> Deactivate(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _couponService.DeactivateAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم إلغاء تفعيل الكوبون" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}