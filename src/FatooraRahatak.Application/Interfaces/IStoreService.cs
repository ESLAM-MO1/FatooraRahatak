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
}