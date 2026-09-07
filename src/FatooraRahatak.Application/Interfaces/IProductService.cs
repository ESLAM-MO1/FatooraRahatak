using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface IProductService
{
    Task<ProductResponseDto> CreateAsync(long storeId, long userId, CreateProductDto dto);
    Task<PagedResult<ProductResponseDto>> GetAllAsync(long storeId, int page = 1, int pageSize = 20);
    Task<ProductResponseDto?> GetByIdAsync(long storeId, long productId);
    Task<ProductResponseDto> UpdateAsync(long storeId, long productId, CreateProductDto dto);
    Task DeleteAsync(long storeId, long productId);
    Task<ProductResponseDto> RestoreAsync(long storeId, long productId);
    Task DeletePermanentAsync(long storeId, long productId);
}