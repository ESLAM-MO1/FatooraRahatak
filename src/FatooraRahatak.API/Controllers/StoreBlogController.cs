using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/store-blog")]
[Authorize]
public class StoreBlogController : ControllerBase
{
    private readonly IStoreBlogService _blogService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public StoreBlogController(IStoreBlogService blogService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _blogService = blogService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [RequirePermission("StoreSettings.View")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _blogService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.View")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _blogService.GetByIdAsync(storeId.Value, id);
        if (result == null)
            return NotFound(new { success = false, message = "المقال غير موجود" });

        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStoreBlogPostDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _blogService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المقال بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateStoreBlogPostDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _blogService.UpdateAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث المقال بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("{id}/toggle-publish")]
    public async Task<IActionResult> TogglePublish(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _blogService.TogglePublishAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم تغيير حالة النشر" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Delete")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _blogService.DeleteAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم حذف المقال بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}