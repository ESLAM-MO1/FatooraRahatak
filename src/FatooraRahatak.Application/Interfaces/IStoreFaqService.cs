using FatooraRahatak.Application.DTOs.Stores;

namespace FatooraRahatak.Application.Interfaces;

public interface IStoreFaqService
{
    Task<List<StoreFaqItemResponseDto>> GetAllAsync(long storeId);
    Task<StoreFaqItemResponseDto> CreateAsync(long storeId, CreateStoreFaqItemDto dto);
    Task<StoreFaqItemResponseDto> UpdateAsync(long storeId, long id, CreateStoreFaqItemDto dto);
    Task<StoreFaqItemResponseDto> TogglePublishAsync(long storeId, long id);
    Task DeleteAsync(long storeId, long id);
}