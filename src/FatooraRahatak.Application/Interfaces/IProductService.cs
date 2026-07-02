using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface IProductService
{
    Task<ProductResponseDto> CreateAsync(long storeId, long userId, CreateProductDto dto);
    Task<List<ProductResponseDto>> GetAllAsync(long storeId);
    Task<ProductResponseDto?> GetByIdAsync(long storeId, long productId);
    Task<ProductResponseDto> UpdateAsync(long storeId, long productId, CreateProductDto dto);
    Task DeleteAsync(long storeId, long productId);
}