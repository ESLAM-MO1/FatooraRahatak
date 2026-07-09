using FatooraRahatak.Application.DTOs.Customers;

namespace FatooraRahatak.Application.Interfaces;

public interface IOwnerCustomerService
{
    Task<List<OwnerCustomerListDto>> GetOwnerCustomersAsync(long storeId);
    Task<OwnerCustomerDetailDto?> GetOwnerCustomerDetailAsync(long storeId, string phone);
}