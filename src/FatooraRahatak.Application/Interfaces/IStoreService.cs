using FatooraRahatak.Application.DTOs.Stores;
namespace FatooraRahatak.Application.Interfaces;
public interface IStoreService
{
    Task<StoreResponseDto> CreateStoreAsync(long ownerUserId, CreateStoreDto dto);
    Task<StoreResponseDto?> GetMyStoreAsync(long ownerUserId);
    Task<CustomDomainResponseDto> UpdateCustomDomainAsync(long ownerUserId, UpdateCustomDomainDto dto);
    Task<ReturnPolicyResponseDto> UpdateReturnPolicyAsync(long ownerUserId, UpdateReturnPolicyDto dto);
    Task<StoreContactResponseDto> UpdateContactAsync(long ownerUserId, UpdateStoreContactDto dto);
    Task<bool> ToggleStoreOnlineAsync(long ownerUserId);
    Task<VatRegistrationResponseDto> ToggleVatRegistrationAsync(long ownerUserId);
    Task<StoreInfoDto> UpdateVatNumberAsync(long ownerUserId, string? vatNumber);
    Task<StoreInfoDto> GetStoreInfoAsync(long ownerUserId);
    Task<List<ShippingMethodDto>> UpdateShippingMethodsAsync(long ownerUserId, UpdateShippingMethodsDto dto);
    Task<List<PaymentMethodDto>> UpdatePaymentMethodsAsync(long ownerUserId, UpdatePaymentMethodsDto dto);
    Task<StoreSocialResponseDto> UpdateSocialInfoAsync(long ownerUserId, UpdateStoreSocialDto dto);
    Task<CurrencyLanguageResponseDto> UpdateCurrencyLanguageAsync(long ownerUserId, UpdateCurrencyLanguageDto dto);
    Task<StoreThemeResponseDto> UpdateThemeAsync(long ownerUserId, UpdateStoreThemeDto dto);
    Task<StoreInfoDto> UpdateStoreSettingsAsync(long ownerUserId, UpdateStoreSettingsDto dto);
    Task<StoreThemeResponseDto> GetThemeAsync(long ownerUserId);
    Task<StoreInfoDto> UpdateLogoAsync(long ownerUserId, UpdateStoreLogoDto dto);
    Task<StoreInfoDto> DeleteLogoAsync(long ownerUserId);
    Task<StoreInfoDto> UpdateShippingDiscountsAsync(long ownerUserId, UpdateShippingDiscountsDto dto);
}