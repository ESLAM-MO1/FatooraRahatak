using Microsoft.AspNetCore.Mvc;
using FatooraRahatak.Application.DTOs.Sales;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores/{storeId}/cart")]
public class CartController : ControllerBase
{
    private readonly ICartService _cartService;

    public CartController(ICartService cartService)
    {
        _cartService = cartService;
    }

    [HttpPost("items")]
    public async Task<IActionResult> AddItem(long storeId, [FromBody] AddToCartDto dto)
    {
        var sessionId = string.IsNullOrWhiteSpace(dto.SessionId) ? Guid.NewGuid().ToString() : dto.SessionId;

        try
        {
            var result = await _cartService.AddItemAsync(storeId, sessionId, dto);
            return Ok(new { success = true, data = result, sessionId, message = "تمت إضافة المنتج للسلة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetCart(long storeId, [FromQuery] string sessionId)
    {
        try
        {
            var result = await _cartService.GetCartAsync(storeId, sessionId);
            return Ok(new { success = true, data = result });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { success = false, message = ex.Message });
        }
    }

    [HttpPut("items/{cartItemId}")]
    public async Task<IActionResult> UpdateItem(long storeId, long cartItemId, [FromBody] UpdateCartItemDto dto)
    {
        try
        {
            var result = await _cartService.UpdateItemAsync(storeId, cartItemId, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث الكمية" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("items/{cartItemId}")]
    public async Task<IActionResult> RemoveItem(long storeId, long cartItemId)
    {
        try
        {
            await _cartService.RemoveItemAsync(storeId, cartItemId);
            return Ok(new { success = true, message = "تم حذف المنتج من السلة" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("apply-coupon")]
    public async Task<IActionResult> ApplyCoupon(long storeId, [FromBody] ApplyCouponDto dto)
    {
        try
        {
            var discount = await _cartService.ApplyCouponAsync(storeId, dto);
            return Ok(new { success = true, data = new { discountAmount = discount }, message = "تم تطبيق الكوبون بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}