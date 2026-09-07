using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.ApiKeys;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/store-api-keys")]
[Authorize]
[RequirePackageFeature("HasApiAccess")]
public class ApiKeyController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly IPermissionCheckService _permCheck;

    public ApiKeyController(IApiKeyService apiKeyService, IPermissionCheckService permCheck)
    {
        _apiKeyService = apiKeyService;
        _permCheck = permCheck;
    }

    private long GetUserId() => long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private async Task<long?> GetStoreIdAsync() => await _permCheck.GetUserStoreIdAsync(GetUserId());

    [HttpGet]
    public async Task<IActionResult> List()
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _apiKeyService.ListAsync(storeId.Value);
        return Ok(new { success = true, data = result });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateStoreApiKeyDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            var result = await _apiKeyService.CreateAsync(storeId.Value, dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المفتاح بنجاح. احفظ المفتاح السري الآن، فلن يظهر مرة أخرى." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Revoke(long id)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        try
        {
            await _apiKeyService.RevokeAsync(storeId.Value, id);
            return Ok(new { success = true, message = "تم سحب المفتاح بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
