using FatooraRahatak.Application.DTOs.Inventory;

namespace FatooraRahatak.Application.Interfaces;

public interface IStockCountService
{
    Task<StockCountResponseDto> StartAsync(long storeId, long userId, StartStockCountDto dto);
    Task SubmitCountedQuantityAsync(long storeId, SubmitCountedQuantityDto dto);
    Task<StockCountResponseDto?> GetByIdAsync(long storeId, long stockCountId);
    Task ApproveAsync(long storeId, long stockCountId, long approvedByUserId);
}