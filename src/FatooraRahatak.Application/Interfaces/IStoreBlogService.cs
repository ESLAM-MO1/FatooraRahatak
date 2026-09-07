using FatooraRahatak.Application.DTOs.Stores;

namespace FatooraRahatak.Application.Interfaces;

public interface IStoreBlogService
{
    Task<List<StoreBlogPostResponseDto>> GetAllAsync(long storeId);
    Task<StoreBlogPostResponseDto> GetByIdAsync(long storeId, long id);
    Task<StoreBlogPostResponseDto> CreateAsync(long storeId, CreateStoreBlogPostDto dto);
    Task<StoreBlogPostResponseDto> UpdateAsync(long storeId, long id, CreateStoreBlogPostDto dto);
    Task<StoreBlogPostResponseDto> TogglePublishAsync(long storeId, long id);
    Task DeleteAsync(long storeId, long id);
}