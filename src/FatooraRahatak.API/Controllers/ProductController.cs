using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/products")]
[Authorize]
public class ProductController : ControllerBase
{
    private readonly IProductService _productService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;
    private readonly IProductImportService _importService;

    public ProductController(IProductService productService, AppDbContext context, IPermissionCheckService permCheck, IProductImportService importService)
    {
        _productService = productService;
        _context = context;
        _permCheck = permCheck;
        _importService = importService;
    }

    [RequirePermission("Products.Add")]
    [HttpGet("import/template")]
    public IActionResult DownloadImportTemplate()
    {
        var bytes = _importService.BuildTemplate();
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "products-import-template.xlsx");
    }

    [RequirePermission("Products.Add")]
    [HttpPost("import"), RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ImportProducts(IFormFile file)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, code = "NO_STORE" });

        if (file == null || file.Length == 0)
            return BadRequest(new { success = false, code = "NO_FILE" });

        if (!string.Equals(Path.GetExtension(file.FileName), ".xlsx", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { success = false, code = "UNSUPPORTED_FORMAT" });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { success = false, code = "FILE_TOO_LARGE" });

        try
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            ms.Position = 0;
            var result = await _importService.ImportAsync(storeId.Value, GetUserId(), ms);
            return Ok(new { success = true, data = result });
        }
        catch (ProductImportException ex)
        {
            return BadRequest(new { success = false, code = ex.Code, details = ex.Details });
        }
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Products.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductDto dto)
    {
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

    [RequirePermission("Products.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _productService.GetAllAsync(storeId.Value, page, pageSize);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Products.View")]
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

    [RequirePermission("Products.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateProductDto dto)
    {
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

    [RequirePermission("Products.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
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

    [RequirePermission("Products.Edit")]
    [HttpPost("{id}/restore")]
    public async Task<IActionResult> Restore(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _productService.RestoreAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم استرجاع المنتج بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Delete")]
    [HttpDelete("{id}/permanent")]
    public async Task<IActionResult> DeletePermanent(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _productService.DeletePermanentAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم حذف المنتج نهائيًا" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Products.Edit")]
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

        var url = Helpers.UrlHelpers.AbsoluteUrl(Request, $"/uploads/{fileName}");
        return Ok(new { success = true, data = new { url } });
    }
}