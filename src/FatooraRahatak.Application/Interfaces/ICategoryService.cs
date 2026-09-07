using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface ICategoryService
{
    Task<CategoryResponseDto> CreateAsync(long storeId, CreateCategoryDto dto);
    Task<List<CategoryResponseDto>> GetAllAsync(long storeId);
    Task<CategoryResponseDto?> GetByIdAsync(long storeId, long categoryId);
    Task<CategoryResponseDto> UpdateAsync(long storeId, long categoryId, CreateCategoryDto dto);
    Task DeleteAsync(long storeId, long categoryId);
}