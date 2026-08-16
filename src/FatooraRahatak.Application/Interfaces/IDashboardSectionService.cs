using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface IDashboardSectionService
{
    Task<List<DashboardSectionDto>> GetAllAsync(string? role = null);
    Task<DashboardSectionDto> CreateAsync(UpsertDashboardSectionDto dto);
    Task UpdateAsync(long id, UpsertDashboardSectionDto dto);
    Task DeleteAsync(long id);
    Task ToggleAsync(long id);
}