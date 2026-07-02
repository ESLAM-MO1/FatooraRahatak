using FatooraRahatak.Application.DTOs.Stores;

namespace FatooraRahatak.Application.Interfaces;

public interface IStoreService
{
    Task<StoreResponseDto> CreateStoreAsync(long ownerUserId, CreateStoreDto dto);
    Task<StoreResponseDto?> GetMyStoreAsync(long ownerUserId);
}