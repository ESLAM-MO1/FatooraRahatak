using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class SiteMenuService : ISiteMenuService
{
    private readonly AppDbContext _context;
    public SiteMenuService(AppDbContext context) { _context = context; }

    public async Task<List<SiteMenuDto>> GetAllMenusAsync()
    {
        return await _context.Set<SiteMenu>()
            .OrderBy(m => m.Location).ThenBy(m => m.SortOrder).ThenBy(m => m.Id)
            .Select(m => new SiteMenuDto
            {
                Id = m.Id, Location = m.Location, TitleAr = m.TitleAr, TitleEn = m.TitleEn,
                Href = m.Href, Icon = m.Icon, ParentId = m.ParentId, SortOrder = m.SortOrder, IsActive = m.IsActive
            })
            .ToListAsync();
    }

    public async Task<List<SiteMenuDto>> GetActiveMenusAsync()
    {
        return await _context.Set<SiteMenu>()
            .Where(m => m.IsActive)
            .OrderBy(m => m.Location).ThenBy(m => m.SortOrder).ThenBy(m => m.Id)
            .Select(m => new SiteMenuDto
            {
                Id = m.Id, Location = m.Location, TitleAr = m.TitleAr, TitleEn = m.TitleEn,
                Href = m.Href, Icon = m.Icon, ParentId = m.ParentId, SortOrder = m.SortOrder, IsActive = m.IsActive
            })
            .ToListAsync();
    }

    public async Task<SiteMenuDto> CreateMenuAsync(CreateSiteMenuDto dto)
    {
        var menu = new SiteMenu
        {
            Location = NormalizeLocation(dto.Location),
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn, Href = dto.Href,
            Icon = string.IsNullOrWhiteSpace(dto.Icon) ? null : dto.Icon,
            ParentId = dto.ParentId == 0 ? null : dto.ParentId,
            SortOrder = dto.SortOrder, IsActive = dto.IsActive
        };
        _context.Set<SiteMenu>().Add(menu);
        await _context.SaveChangesAsync();
        return ToDto(menu);
    }

    public async Task UpdateMenuAsync(long id, CreateSiteMenuDto dto)
    {
        var menu = await _context.Set<SiteMenu>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        menu.Location = NormalizeLocation(dto.Location);
        menu.TitleAr = dto.TitleAr; menu.TitleEn = dto.TitleEn; menu.Href = dto.Href;
        menu.Icon = string.IsNullOrWhiteSpace(dto.Icon) ? null : dto.Icon;
        menu.ParentId = dto.ParentId == 0 ? null : dto.ParentId;
        menu.SortOrder = dto.SortOrder; menu.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteMenuAsync(long id)
    {
        var menu = await _context.Set<SiteMenu>().FindAsync(id);
        if (menu != null)
        {
            _context.Set<SiteMenu>().Remove(menu);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ToggleMenuActiveAsync(long id)
    {
        var menu = await _context.Set<SiteMenu>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        menu.IsActive = !menu.IsActive;
        await _context.SaveChangesAsync();
    }

    private static string NormalizeLocation(string location) =>
        string.IsNullOrWhiteSpace(location) ? "header" : location.Trim().ToLower();

    private static SiteMenuDto ToDto(SiteMenu m) => new SiteMenuDto
    {
        Id = m.Id, Location = m.Location, TitleAr = m.TitleAr, TitleEn = m.TitleEn,
        Href = m.Href, Icon = m.Icon, ParentId = m.ParentId, SortOrder = m.SortOrder, IsActive = m.IsActive
    };
}