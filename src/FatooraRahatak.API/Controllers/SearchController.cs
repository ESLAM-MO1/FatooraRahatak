using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/search")]
[Authorize]
public class SearchController : ControllerBase
{
    private readonly ISearchService _searchService;
    private readonly AppDbContext _context;

    public SearchController(ISearchService searchService, AppDbContext context)
    {
        _searchService = searchService;
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var userId = long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

        var storeId = await _context.Stores
            .Where(s => s.OwnerUserId == userId)
            .Select(s => (long?)s.Id)
            .FirstOrDefaultAsync();

        if (storeId == null)
        {
            storeId = await _context.Employees
                .Where(e => e.UserId == userId)
                .Select(e => (long?)e.StoreId)
                .FirstOrDefaultAsync();
        }

        if (storeId == null)
            return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بالحساب" });

        var result = await _searchService.SearchAsync(storeId.Value, q);
        return Ok(new { success = true, data = result });
    }
}