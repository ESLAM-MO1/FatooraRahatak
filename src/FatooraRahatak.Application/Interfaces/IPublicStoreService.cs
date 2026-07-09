using FatooraRahatak.Application.DTOs.Public;

namespace FatooraRahatak.Application.Interfaces;

public interface IPublicStoreService
{
    Task<PublicStoreDto?> GetStoreBySlugAsync(string slug);
    Task<List<PublicCategoryDto>?> GetCategoriesAsync(string slug);
    Task<List<PublicProductDto>?> GetProductsAsync(string slug, long? categoryId);
    Task<PublicProductDetailDto?> GetProductDetailAsync(string slug, long productId);
    Task<ReturnPolicyDto?> GetReturnPolicyAsync(string slug);
    Task<StoreContactDto?> GetContactAsync(string slug);
    Task<PublicOrderDetailDto?> GetOrderAsync(string slug, string orderNumber, string? phone, long? customerId);
}