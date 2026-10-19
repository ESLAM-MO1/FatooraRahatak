using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/categories")]
[Authorize]
public class CategoryController : ControllerBase
{
    private readonly ICategoryService _categoryService;
    private readonly ICategoryImportService _importService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public CategoryController(ICategoryService categoryService, ICategoryImportService importService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _categoryService = categoryService;
        _importService = importService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("Categories.Add")]
    [HttpGet("import/template")]
    public IActionResult DownloadImportTemplate()
    {
        var bytes = _importService.BuildTemplate();
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "categories-import-template.xlsx");
    }

    [RequirePermission("Categories.Add")]
    [HttpPost("import"), RequestSizeLimit(10 * 1024 * 1024)]
    public async Task<IActionResult> ImportCategories(IFormFile file)
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
            var result = await _importService.ImportAsync(storeId.Value, ms);
            return Ok(new { success = true, data = result });
        }
        catch (CategoryImportException ex)
        {
            return BadRequest(new { success = false, code = ex.Code, details = ex.Details });
        }
    }

    [RequirePermission("Categories.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _categoryService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء التصنيف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Categories.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _categoryService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Categories.View")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _categoryService.GetByIdAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "التصنيف غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("Categories.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateCategoryDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _categoryService.UpdateAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث التصنيف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("Categories.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _categoryService.DeleteAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم حذف التصنيف بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
