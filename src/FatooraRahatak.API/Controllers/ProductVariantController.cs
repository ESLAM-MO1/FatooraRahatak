using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/products/{productId}")]
[Authorize]
public class ProductVariantController : ControllerBase
{
    private readonly IProductVariantService _variantService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public ProductVariantController(IProductVariantService variantService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _variantService = variantService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Products.Add")]
    [HttpPost("variants")]
    public async Task<IActionResult> CreateVariant(long productId, [FromBody] CreateVariantDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _variantService.CreateVariantAsync(storeId.Value, GetUserId(), productId, dto);
            return Ok(new { success = true, data = result, message = "تم إضافة المتغير بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.View")]
    [HttpGet("variants")]
    public async Task<IActionResult> GetVariants(long productId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _variantService.GetVariantsAsync(storeId.Value, productId);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Delete")]
    [HttpDelete("variants/{variantId}")]
    public async Task<IActionResult> DeleteVariant(long productId, long variantId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _variantService.DeleteVariantAsync(storeId.Value, productId, variantId);
            return Ok(new { success = true, message = "تم حذف المتغير بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Edit")]
    [HttpPut("variants/{variantId}/deactivate")]
    public async Task<IActionResult> DeactivateVariant(long productId, long variantId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _variantService.DeactivateVariantAsync(storeId.Value, productId, variantId);
            return Ok(new { success = true, message = "تم إخفاء المتغير بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Edit")]
    [HttpPost("images")]
    public async Task<IActionResult> AddImage(long productId, [FromBody] AddProductImageDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _variantService.AddImageAsync(storeId.Value, productId, dto);
            return Ok(new { success = true, data = result, message = "تمت إضافة الصورة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.View")]
    [HttpGet("images")]
    public async Task<IActionResult> GetImages(long productId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _variantService.GetImagesAsync(storeId.Value, productId);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Delete")]
    [HttpDelete("images/{imageId}")]
    public async Task<IActionResult> DeleteImage(long productId, long imageId)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _variantService.DeleteImageAsync(storeId.Value, productId, imageId);
            return Ok(new { success = true, message = "تم حذف الصورة بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}