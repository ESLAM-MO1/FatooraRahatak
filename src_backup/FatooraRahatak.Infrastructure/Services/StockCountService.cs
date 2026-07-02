using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Inventory;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class StockCountService : IStockCountService
{
    private readonly AppDbContext _context;

    public StockCountService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<StockCountResponseDto> StartAsync(long storeId, long userId, StartStockCountDto dto)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId && w.StoreId == storeId);
        if (warehouse == null)
            throw new InvalidOperationException("المخزن غير موجود");

        var alreadyInProgress = await _context.StockCounts
            .AnyAsync(s => s.WarehouseId == dto.WarehouseId && s.Status == StockCountStatus.InProgress);
        if (alreadyInProgress)
            throw new InvalidOperationException("يوجد جرد قيد التنفيذ بالفعل لهذا المخزن");

        var stockCount = new StockCount
        {
            WarehouseId = dto.WarehouseId,
            Status = StockCountStatus.InProgress,
            StartedByUserId = userId
        };

        _context.StockCounts.Add(stockCount);
        await _context.SaveChangesAsync();

        // ==== نسخ الكميات الحالية (System Quantity) كنقطة بداية للجرد ====
        var currentStock = await _context.InventoryStocks
            .Where(s => s.WarehouseId == dto.WarehouseId)
            .ToListAsync();

        foreach (var stock in currentStock)
        {
            _context.StockCountItems.Add(new StockCountItem
            {
                StockCountId = stockCount.Id,
                ProductId = stock.ProductId,
                VariantId = stock.VariantId,
                SystemQuantity = stock.QuantityAvailable,
                CountedQuantity = null
            });
        }

        await _context.SaveChangesAsync();

        return await BuildResponseAsync(stockCount.Id);
    }

    public async Task SubmitCountedQuantityAsync(long storeId, SubmitCountedQuantityDto dto)
    {
        var item = await _context.StockCountItems
            .Include(i => i.StockCount)
            .ThenInclude(sc => sc.Warehouse)
            .FirstOrDefaultAsync(i => i.Id == dto.StockCountItemId);

        if (item == null || item.StockCount.Warehouse.StoreId != storeId)
            throw new InvalidOperationException("عنصر الجرد غير موجود");

        if (item.StockCount.Status != StockCountStatus.InProgress)
            throw new InvalidOperationException("لا يمكن تعديل جرد غير قيد التنفيذ");

        item.CountedQuantity = dto.CountedQuantity;
        await _context.SaveChangesAsync();
    }

    public async Task<StockCountResponseDto?> GetByIdAsync(long storeId, long stockCountId)
    {
        var stockCount = await _context.StockCounts
            .Include(s => s.Warehouse)
            .FirstOrDefaultAsync(s => s.Id == stockCountId && s.Warehouse.StoreId == storeId);

        if (stockCount == null) return null;

        return await BuildResponseAsync(stockCountId);
    }

    public async Task ApproveAsync(long storeId, long stockCountId, long approvedByUserId)
    {
        var stockCount = await _context.StockCounts
            .Include(s => s.Warehouse)
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == stockCountId && s.Warehouse.StoreId == storeId);

        if (stockCount == null)
            throw new InvalidOperationException("الجرد غير موجود");

        if (stockCount.Status != StockCountStatus.InProgress)
            throw new InvalidOperationException("تم اعتماد هذا الجرد بالفعل أو تم إلغاؤه");

        var uncounted = stockCount.Items.Any(i => i.CountedQuantity == null);
        if (uncounted)
            throw new InvalidOperationException("لا يمكن الاعتماد قبل إدخال الكميات الفعلية لجميع المنتجات");

        foreach (var item in stockCount.Items)
        {
            if (item.Variance == 0) continue; // مفيش فرق، متعملش حاجة

            var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
                s.WarehouseId == stockCount.WarehouseId && s.ProductId == item.ProductId && s.VariantId == item.VariantId);

            if (stock != null)
                stock.QuantityAvailable = item.CountedQuantity!.Value;

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                WarehouseId = stockCount.WarehouseId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                TransactionType = InventoryTransactionType.Adjustment,
                Quantity = item.Variance, // موجب أو سالب
                ReferenceType = "StockCount",
                ReferenceId = stockCount.Id,
                CreatedByUserId = approvedByUserId
            });
        }

        stockCount.Status = StockCountStatus.Completed;
        stockCount.ApprovedByUserId = approvedByUserId;
        stockCount.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    private async Task<StockCountResponseDto> BuildResponseAsync(long stockCountId)
    {
        var stockCount = await _context.StockCounts.FirstAsync(s => s.Id == stockCountId);

        var items = await _context.StockCountItems
            .Include(i => i.Product)
            .Where(i => i.StockCountId == stockCountId)
            .Select(i => new StockCountItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductNameAr = i.Product.NameAr,
                VariantId = i.VariantId,
                SystemQuantity = i.SystemQuantity,
                CountedQuantity = i.CountedQuantity,
                Variance = i.Variance
            })
            .ToListAsync();

        return new StockCountResponseDto
        {
            Id = stockCount.Id,
            WarehouseId = stockCount.WarehouseId,
            Status = stockCount.Status.ToString(),
            Items = items
        };
    }
}