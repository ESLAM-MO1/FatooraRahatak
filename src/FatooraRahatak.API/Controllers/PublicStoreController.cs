using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.Interfaces;
namespace FatooraRahatak.API.Controllers;
[ApiController]
[Route("api/v1/public/stores")]
public class PublicStoreController : ControllerBase
{
    private readonly IPublicStoreService _publicStoreService;
    private readonly IOrderService _orderService;
    public PublicStoreController(IPublicStoreService publicStoreService, IOrderService orderService)
    {
        _publicStoreService = publicStoreService;
        _orderService = orderService;
    }
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetStore(string slug)
    {
        var store = await _publicStoreService.GetStoreBySlugAsync(slug);
        if (store == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = store });
    }
    [HttpGet("{slug}/categories")]
    public async Task<IActionResult> GetCategories(string slug)
    {
        var categories = await _publicStoreService.GetCategoriesAsync(slug);
        if (categories == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = categories });
    }
    [HttpGet("{slug}/products")]
    public async Task<IActionResult> GetProducts(string slug, [FromQuery] long? categoryId)
    {
        var products = await _publicStoreService.GetProductsAsync(slug, categoryId);
        if (products == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = products });
    }
    [HttpGet("{slug}/products/{productId}")]
    public async Task<IActionResult> GetProductDetail(string slug, long productId)
    {
        var product = await _publicStoreService.GetProductDetailAsync(slug, productId);
        if (product == null)
            return NotFound(new { success = false, message = "المنتج غير موجود" });
        return Ok(new { success = true, data = product });
    }
    [HttpGet("{slug}/return-policy")]
    public async Task<IActionResult> GetReturnPolicy(string slug)
    {
        var policy = await _publicStoreService.GetReturnPolicyAsync(slug);
        if (policy == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = policy });
    }
    [HttpGet("{slug}/contact")]
    public async Task<IActionResult> GetContact(string slug)
    {
        var contact = await _publicStoreService.GetContactAsync(slug);
        if (contact == null)
            return NotFound(new { success = false, message = "المتجر غير موجود أو غير نشط" });
        return Ok(new { success = true, data = contact });
    }
    [HttpGet("{slug}/orders/{orderNumber}")]
    public async Task<IActionResult> GetOrder(string slug, string orderNumber, [FromQuery] string? phone)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }

        var order = await _publicStoreService.GetOrderAsync(slug, orderNumber, phone, customerId);
        if (order == null)
            return NotFound(new { success = false, message = "الطلب غير موجود أو بيانات التحقق غير صحيحة" });

        return Ok(new { success = true, data = order });
    }
    [HttpPost("{slug}/checkout")]
    public async Task<IActionResult> Checkout(string slug, [FromBody] CheckoutRequestDto dto)
    {
        long? customerId = null;
        if (User.Identity?.IsAuthenticated == true)
        {
            var idClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (idClaim != null) customerId = long.Parse(idClaim);
        }
        try
        {
            var result = await _orderService.CheckoutAsync(slug, customerId, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الطلب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}