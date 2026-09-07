using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface IProductVariantService
{
    Task<VariantResponseDto> CreateVariantAsync(long storeId, long userId, long productId, CreateVariantDto dto);
    Task<List<VariantResponseDto>> GetVariantsAsync(long storeId, long productId);
    Task DeleteVariantAsync(long storeId, long productId, long variantId);
    Task DeactivateVariantAsync(long storeId, long productId, long variantId);

    Task<ProductImageResponseDto> AddImageAsync(long storeId, long productId, AddProductImageDto dto);
    Task<List<ProductImageResponseDto>> GetImagesAsync(long storeId, long productId);
    Task DeleteImageAsync(long storeId, long productId, long imageId);
}