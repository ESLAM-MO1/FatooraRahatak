using FatooraRahatak.Application.DTOs.Sales;

namespace FatooraRahatak.Application.Interfaces;

public interface ICartService
{
    Task<CartResponseDto> AddItemAsync(long storeId, string sessionId, AddToCartDto dto);
    Task<CartResponseDto> GetCartAsync(long storeId, string sessionId);
    Task<CartResponseDto> UpdateItemAsync(long storeId, long cartItemId, UpdateCartItemDto dto);
    Task RemoveItemAsync(long storeId, long cartItemId);
    Task<decimal> ApplyCouponAsync(long storeId, ApplyCouponDto dto);
    Task MarkAbandonedCartsAsync(); // Job دوري
}