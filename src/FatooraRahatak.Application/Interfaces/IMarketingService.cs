using FatooraRahatak.Application.DTOs.Marketing;

namespace FatooraRahatak.Application.Interfaces;

public interface IMarketingService
{
    Task<List<MarketingIntegrationDto>> GetIntegrationsAsync(long storeId);
    Task<MarketingIntegrationDto> UpsertIntegrationAsync(long storeId, UpsertMarketingIntegrationDto dto);
    Task ToggleIntegrationAsync(long storeId, long id);
    Task DeleteIntegrationAsync(long storeId, long id);
    Task<List<MarketingCampaignDto>> GetCampaignsAsync(long storeId);
    Task<MarketingCampaignDto> CreateCampaignAsync(long storeId, CreateMarketingCampaignDto dto);
    Task<MarketingCampaignDto> UpdateCampaignAsync(long storeId, long id, CreateMarketingCampaignDto dto);
    Task DeleteCampaignAsync(long storeId, long id);
    Task<MarketingPerformanceDto> GetPerformanceAsync(long storeId, DateTime? from, DateTime? to);
    Task<StorePublicScriptsDto> GetPublicScriptsBySlugAsync(string slug);
    Task<ConversionTestResultDto> TestConversionEventAsync(long storeId, long integrationId);
}