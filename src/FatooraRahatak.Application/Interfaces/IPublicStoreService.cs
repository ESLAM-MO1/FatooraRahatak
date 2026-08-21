using FatooraRahatak.Application.DTOs.Public;

namespace FatooraRahatak.Application.Interfaces;

public interface IPublicStoreService
{
    Task<PublicStoreDto?> GetStoreBySlugAsync(string slug);
    Task<List<PublicCategoryDto>?> GetCategoriesAsync(string slug);
    Task<List<PublicProductDto>?> GetProductsAsync(string slug, long? categoryId);
    Task<PublicProductDetailDto?> GetProductDetailAsync(string slug, long productId);
    Task<List<PublicProductDto>?> GetRelatedProductsAsync(string slug, long productId);
    Task<ReturnPolicyDto?> GetReturnPolicyAsync(string slug);
    Task<PublicStorePageDto?> GetStorePageAsync(string slug, string pageKey);
    Task<List<PublicStoreFaqItemDto>?> GetStoreFaqAsync(string slug);
    Task<PublicStoreBlogPostDto?> GetStoreBlogPostAsync(string slug, string slugKey);
    Task<List<PublicStoreBlogPostDto>?> GetStoreBlogPostsAsync(string slug);
    Task<StoreContactDto?> GetContactAsync(string slug);
    Task<PublicOrderDetailDto?> GetOrderAsync(string slug, string orderNumber, string? phone, long? customerId);
    Task<List<PublicProductReviewDto>?> GetProductReviewsAsync(string slug, long productId);
    Task<PublicProductReviewDto?> CreateProductReviewAsync(string slug, long productId, long? customerId, CreateProductReviewDto dto);
    Task<List<CustomerAddressDto>> GetCustomerAddressesAsync(string slug, string phone);
    Task<CustomerAddressDto> SaveCustomerAddressAsync(string slug, string phone, SaveCustomerAddressDto dto);
    Task<CustomerAddressDto> UpdateCustomerAddressAsync(string slug, string phone, long addressId, SaveCustomerAddressDto dto);
    Task DeleteCustomerAddressAsync(string slug, string phone, long addressId);
    Task<List<CustomerOrderListItemDto>> GetCustomerOrdersAsync(string slug, string phone);
    Task<PublicShippingQuoteResultDto> GetShippingQuoteAsync(string slug, PublicShippingQuoteRequestDto dto);
}