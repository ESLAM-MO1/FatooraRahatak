using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface ISiteMenuService
{
    Task<List<SiteMenuDto>> GetAllMenusAsync();
    Task<List<SiteMenuDto>> GetActiveMenusAsync();
    Task<SiteMenuDto> CreateMenuAsync(CreateSiteMenuDto dto);
    Task UpdateMenuAsync(long id, CreateSiteMenuDto dto);
    Task DeleteMenuAsync(long id);
    Task ToggleMenuActiveAsync(long id);
}