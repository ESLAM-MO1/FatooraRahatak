using FatooraRahatak.Application.DTOs.Inventory;

namespace FatooraRahatak.Application.Interfaces;

public interface IInventoryService
{
    Task<WarehouseResponseDto> CreateWarehouseAsync(long storeId, CreateWarehouseDto dto);
    Task<List<WarehouseResponseDto>> GetWarehousesAsync(long storeId);
    Task<List<StockItemDto>> GetStockAsync(long storeId, long? warehouseId, long? productId);
    Task<long> CreateStockTransferAsync(long storeId, long userId, CreateStockTransferDto dto);
    Task ApproveStockTransferAsync(long storeId, long transferId, long approvedByUserId);
    Task<long> ReportDamagedStockAsync(long storeId, long userId, CreateDamagedStockDto dto);
    Task ApproveDamagedStockAsync(long storeId, long damageId, long approvedByUserId);
    Task<List<StockTransferListDto>> GetStockTransfersAsync(long storeId);
    Task<List<DamagedStockListDto>> GetDamagedStocksAsync(long storeId);
}