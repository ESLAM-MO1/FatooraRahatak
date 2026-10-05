using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using FatooraRahatak.API.Filters;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/domain-purchase-requests")]
[Authorize]
public class DomainPurchaseController : ControllerBase
{
    private readonly IDomainPurchaseService _service;

    public DomainPurchaseController(IDomainPurchaseService service)
    {
        _service = service;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [RequirePermission("StoreSettings.View")]
    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var data = await _service.GetMyLatestAsync(GetUserId());
        return Ok(new { success = true, data });
    }

    [RequirePermission("StoreSettings.Edit")]
    [RequirePackageFeature("HasCustomDomain")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDomainPurchaseRequestDto dto)
    {
        try
        {
            var data = await _service.CreateAsync(GetUserId(), dto);
            return Ok(new { success = true, data, message = "تم إرسال طلبك بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}
