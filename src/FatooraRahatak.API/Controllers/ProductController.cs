using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/products")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public ProductController(IProductService productService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _productService = productService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync()
    {
        var userId = GetUserId();
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Products.Add"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية لتنفيذ هذا الإجراء" }); }

        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _productService.CreateAsync(storeId.Value, GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المنتج بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _productService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _productService.GetByIdAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "المنتج غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateProductDto dto)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Products.Edit"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية لتنفيذ هذا الإجراء" }); }

        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _productService.UpdateAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث المنتج بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var userId = GetUserId();
        try { await _permCheck.EnsurePermissionAsync(userId, "Products.Delete"); }
        catch (UnauthorizedAccessException) { return StatusCode(403, new { success = false, message = "ليس لديك صلاحية لتنفيذ هذا الإجراء" }); }

        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _productService.DeleteAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم أرشفة المنتج بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("upload-image"), DisableRequestSizeLimit]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, message = "الملف مطلوب" });

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new[] { ".jpg", ".jpeg", ".png", ".webp", ".gif" };
        if (!allowed.Contains(ext))
            return BadRequest(new { success = false, message = "صيغة الملف غير مدعومة. استخدم JPG, PNG, WebP أو GIF" });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, message = "حجم الملف يتجاوز 5 ميجابايت" });

        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/uploads/{fileName}";
        return Ok(new { success = true, data = new { url } });
    }
}