using System.Text.Json;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class DashboardSectionService : IDashboardSectionService
{
    private readonly AppDbContext _context;
    public DashboardSectionService(AppDbContext context) { _context = context; }

    public async Task<List<DashboardSectionDto>> GetAllAsync(string? role = null)
    {
        var q = _context.Set<DashboardSection>().AsQueryable();
        if (!string.IsNullOrWhiteSpace(role))
            q = q.Where(s => s.Role == role);
        var list = await q
            .OrderBy(s => s.Role).ThenBy(s => s.SortOrder).ThenBy(s => s.Id)
            .ToListAsync();
        return list.Select(s => new DashboardSectionDto
        {
            Id = s.Id, Key = s.Key, TitleAr = s.TitleAr, TitleEn = s.TitleEn,
            Icon = s.Icon, Role = s.Role, SortOrder = s.SortOrder, IsActive = s.IsActive,
            Links = ParseLinks(s.ItemsJson)
        }).ToList();
    }

    public async Task<DashboardSectionDto> CreateAsync(UpsertDashboardSectionDto dto)
    {
        var section = new DashboardSection
        {
            Key = string.IsNullOrWhiteSpace(dto.Key) ? Guid.NewGuid().ToString("N") : dto.Key.Trim(),
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn,
            Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "settings" : dto.Icon,
            Role = string.IsNullOrWhiteSpace(dto.Role) ? "SuperAdmin" : dto.Role,
            SortOrder = dto.SortOrder, IsActive = dto.IsActive,
            ItemsJson = JsonSerializer.Serialize(dto.Links ?? new List<DashboardLinkDto>())
        };
        _context.Set<DashboardSection>().Add(section);
        await _context.SaveChangesAsync();
        return new DashboardSectionDto
        {
            Id = section.Id, Key = section.Key, TitleAr = section.TitleAr, TitleEn = section.TitleEn,
            Icon = section.Icon, Role = section.Role, SortOrder = section.SortOrder,
            IsActive = section.IsActive, Links = dto.Links ?? new List<DashboardLinkDto>()
        };
    }

    public async Task UpdateAsync(long id, UpsertDashboardSectionDto dto)
    {
        var section = await _context.Set<DashboardSection>().FindAsync(id)
            ?? throw new InvalidOperationException("غير موجود");
        section.TitleAr = dto.TitleAr;
        section.TitleEn = dto.TitleEn;
        section.Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "settings" : dto.Icon;
        section.Role = string.IsNullOrWhiteSpace(dto.Role) ? "SuperAdmin" : dto.Role;
        section.SortOrder = dto.SortOrder;
        section.IsActive = dto.IsActive;
        section.ItemsJson = JsonSerializer.Serialize(dto.Links ?? new List<DashboardLinkDto>());
        if (!string.IsNullOrWhiteSpace(dto.Key))
            section.Key = dto.Key.Trim();
        await _context.SaveChangesAsync();
    }

    public async Task DeleteAsync(long id)
    {
        var section = await _context.Set<DashboardSection>().FindAsync(id);
        if (section != null)
        {
            _context.Set<DashboardSection>().Remove(section);
            await _context.SaveChangesAsync();
        }
    }

    public async Task ToggleAsync(long id)
    {
        var section = await _context.Set<DashboardSection>().FindAsync(id)
            ?? throw new InvalidOperationException("غير موجود");
        section.IsActive = !section.IsActive;
        await _context.SaveChangesAsync();
    }

    private static List<DashboardLinkDto> ParseLinks(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<DashboardLinkDto>();
        try
        {
            return JsonSerializer.Deserialize<List<DashboardLinkDto>>(json) ?? new List<DashboardLinkDto>();
        }
        catch
        {
            return new List<DashboardLinkDto>();
        }
    }
}