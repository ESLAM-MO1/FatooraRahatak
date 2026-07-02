using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/stores")]
[Authorize]
public class StoreController : ControllerBase
{
    private readonly IStoreService _storeService;

    public StoreController(IStoreService storeService)
    {
        _storeService = storeService;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpPost]
    public async Task<IActionResult> CreateStore([FromBody] CreateStoreDto dto)
    {
        try
        {
            var result = await _storeService.CreateStoreAsync(GetUserId(), dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء المتجر بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpGet("my-store")]
    public async Task<IActionResult> GetMyStore()
    {
        var result = await _storeService.GetMyStoreAsync(GetUserId());
        if (result == null)
            return NotFound(new { success = false, message = "لا يوجد متجر مرتبط بحسابك بعد" });

        return Ok(new { success = true, data = result });
    }
}