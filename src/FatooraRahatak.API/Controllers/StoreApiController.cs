using Microsoft.AspNetCore.Mvc;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/store-api")]
public class StoreApiController : ControllerBase
{
    private readonly IApiKeyService _apiKeyService;
    private readonly AppDbContext _context;

    public StoreApiController(IApiKeyService apiKeyService, AppDbContext context)
    {
        _apiKeyService = apiKeyService;
        _context = context;
    }

    private async Task<long?> ResolveStoreIdAsync()
    {
        // يدعم: X-API-Key = "pk:sk" أو headerين منفصلين X-API-Public-Key / X-API-Secret-Key
        var combined = Request.Headers["X-API-Key"].ToString();
        if (!string.IsNullOrWhiteSpace(combined) && combined.Contains(':'))
        {
            var parts = combined.Split(':', 2);
            return await _apiKeyService.ValidateAsync(parts[0].Trim(), parts[1].Trim());
        }

        var publicKey = Request.Headers["X-API-Public-Key"].ToString();
        var secretKey = Request.Headers["X-API-Secret-Key"].ToString();
        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(secretKey))
            return null;

        return await _apiKeyService.ValidateAsync(publicKey.Trim(), secretKey.Trim());
    }

    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var storeId = await ResolveStoreIdAsync();
        if (storeId == null)
            return Unauthorized(new { success = false, message = "مفتاح API غير صالح أو تم سحبه" });

        var store = await _context.Stores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == storeId.Value);
        if (store == null)
            return NotFound(new { success = false, message = "المتجر غير موجود" });

        return Ok(new
        {
            success = true,
            data = new
            {
                store.StoreName,
                store.StoreSlug,
                store.CustomDomain,
                store.Currency,
                store.IsOnline,
                store.Logo
            }
        });
    }
}
