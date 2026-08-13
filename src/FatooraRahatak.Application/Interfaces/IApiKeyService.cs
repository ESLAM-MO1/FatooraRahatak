using FatooraRahatak.Application.DTOs.ApiKeys;

namespace FatooraRahatak.Application.Interfaces;

public interface IApiKeyService
{
    Task<StoreApiKeyDto> CreateAsync(long storeId, CreateStoreApiKeyDto dto);
    Task<List<StoreApiKeyDto>> ListAsync(long storeId);
    Task RevokeAsync(long storeId, long id);
    /// <summary>يتحقق من المفتاح العام والسري ويعيد معرف المتجر أو null عند الفشل.</summary>
    Task<long?> ValidateAsync(string publicKey, string secretKey);
}
