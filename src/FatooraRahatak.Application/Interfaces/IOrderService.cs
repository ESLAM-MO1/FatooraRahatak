using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.DTOs.Orders;

namespace FatooraRahatak.Application.Interfaces;

public interface IOrderService
{
    Task<OrderConfirmationDto> CheckoutAsync(string slug, long? customerId, CheckoutRequestDto dto);

   
    Task<List<OwnerOrderListDto>> GetOwnerOrdersAsync(long storeId, string? status);
    Task<OwnerOrderDetailDto?> GetOwnerOrderDetailAsync(long storeId, long orderId);
    Task UpdateOrderStatusAsync(long storeId, long orderId, long? changedByUserId, string newStatus);
}