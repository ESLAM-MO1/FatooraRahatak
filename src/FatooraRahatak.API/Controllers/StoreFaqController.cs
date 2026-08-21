using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/store-faq")]
[Authorize]
public class StoreFaqController : ControllerBase
{
    private readonly IStoreFaqService _faqService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public StoreFaqController(IStoreFaqService faqService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _faqService = faqService;
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

        var result = await _faqService.GetAllAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [RequirePermission("StoreSettings.Add")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStoreFaqItemDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _faqService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إضافة السؤال بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [RequirePermission("StoreSettings.Edit")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(long id, [FromBody] CreateStoreFaqItemDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _faqService.UpdateAsync(storeId.Value, id, dto);
            return Ok(new { success = true, data = result, message = "تم تحديث السؤال بنجاح" });
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
            var result = await _faqService.TogglePublishAsync(storeId.Value, id);
            return Ok(new { success = true, data = result, message = "تم تغيير حالة العرض" });
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
            await _faqService.DeleteAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم حذف السؤال بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}