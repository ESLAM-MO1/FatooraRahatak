using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.DTOs.Orders;

namespace FatooraRahatak.Application.Interfaces;

public interface IOrderService
{
    Task<OrderConfirmationDto> CheckoutAsync(string slug, long? customerId, CheckoutRequestDto dto);

   
    Task<PagedResult<OwnerOrderListDto>> GetOwnerOrdersAsync(long storeId, string? status, int page = 1, int pageSize = 20);
    Task<OwnerOrderDetailDto?> GetOwnerOrderDetailAsync(long storeId, long orderId);
    Task UpdateOrderStatusAsync(long storeId, long orderId, long? changedByUserId, string newStatus);

    Task CancelOrderAsync(long storeId, long orderId, long? changedByUserId);
    Task CancelOrderPublicAsync(string slug, string orderNumber, string phone);
    Task RequestReturnAsync(string slug, long? customerId, RequestReturnDto dto);
    Task<List<ReturnRequestDto>> GetReturnRequestsAsync(long storeId);
    Task HandleReturnRequestAsync(long storeId, long returnRequestId, bool approve, string? note, long? changedByUserId);
}