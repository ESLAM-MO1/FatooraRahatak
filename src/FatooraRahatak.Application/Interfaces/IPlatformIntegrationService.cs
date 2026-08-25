using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface IPlatformIntegrationService
{
    Task<List<PlatformIntegrationDto>> GetIntegrationsAsync(long storeId);
    Task<PlatformIntegrationDto> ConnectAsync(long storeId, ConnectPlatformIntegrationDto dto);
    Task<PlatformIntegrationDto?> UpdateAsync(long storeId, long id, UpdatePlatformIntegrationDto dto);
    Task<bool> DeleteAsync(long storeId, long id);
    Task<PlatformIntegrationDto?> ToggleEnabledAsync(long storeId, long id, bool isEnabled);
}