using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.Interfaces;

public interface ICustomerNotificationService
{
    Task SendOrderCreatedNotificationAsync(Store store, Order order);
    Task SendOrderStatusNotificationAsync(Store store, Order order, OrderStatus newStatus);
    Task SendReturnDecisionNotificationAsync(Store store, Order order, bool approved, string? note);
    Task<string> SendTestNotificationAsync(Store store);
}
