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
    private readonly INotificationService _notificationService;
    private readonly IAccountingService _accountingService;

    public StockCountService(AppDbContext context, INotificationService notificationService, IAccountingService accountingService)
    {
        _context = context;
        _notificationService = notificationService;
        _accountingService = accountingService;
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

        if (dto.CountedQuantity < 0)
            throw new InvalidOperationException("الكمية المعدودة لا يمكن أن تكون سالبة");

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

        var productIds = stockCount.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        decimal shortageAmount = 0m, overageAmount = 0m;

        foreach (var item in stockCount.Items)
        {
            if (item.Variance == 0) continue;

            var cost = products.TryGetValue(item.ProductId, out var p) ? p.CostPrice : 0m;
            if (item.Variance < 0)
                shortageAmount += Math.Abs(item.Variance) * cost;
            else
                overageAmount += item.Variance * cost;

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
                Quantity = item.Variance,
                ReferenceType = "StockCount",
                ReferenceId = stockCount.Id,
                CreatedByUserId = approvedByUserId
            });
        }

        stockCount.Status = StockCountStatus.Completed;
        stockCount.ApprovedByUserId = approvedByUserId;
        stockCount.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        if (shortageAmount > 0 || overageAmount > 0)
            await _accountingService.CreateStockCountVarianceEntryAsync(
                stockCount.Warehouse.StoreId, shortageAmount, overageAmount,
                $"قيد تلقائي — فرق جرد مخزن {stockCount.Warehouse.WarehouseName}",
                approvedByUserId);

        try
        {
            if (stockCount.StartedByUserId != approvedByUserId)
            {
                await _notificationService.CreateAsync(
                    stockCount.StartedByUserId,
                    "تم اعتماد الجرد الدوري",
                    $"تم اعتماد جرد {stockCount.Warehouse.WarehouseName} بعد إدخال الكميات الفعلية",
                    NotificationType.StockCountCompleted,
                    $"/dashboard/stock-counts/{stockCount.Id}");
            }
        }
        catch { }
    }

    public async Task CancelAsync(long storeId, long stockCountId)
    {
        var stockCount = await _context.StockCounts
            .Include(s => s.Warehouse)
            .FirstOrDefaultAsync(s => s.Id == stockCountId && s.Warehouse.StoreId == storeId);

        if (stockCount == null)
            throw new InvalidOperationException("الجرد غير موجود");

        // ⚠️ الإلغاء مسموح فقط للجرد قيد التنفيذ (InProgress) — لا يمكن إلغاء جرد
        // مكتمل أو مُلغى. هذا يحرّر المخزن ليبدأ جردًا جديدًا فورًا.
        if (stockCount.Status != StockCountStatus.InProgress)
            throw new InvalidOperationException("لا يمكن إلغاء سوى جرد قيد التنفيذ");

        stockCount.Status = StockCountStatus.Cancelled;
        stockCount.CompletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<List<StockCountListDto>> GetAllAsync(long storeId)
    {
        return await _context.StockCounts
            .Include(s => s.Warehouse)
            .Include(s => s.Items)
            .Where(s => s.Warehouse.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new StockCountListDto
            {
                Id = s.Id,
                WarehouseName = s.Warehouse.WarehouseName,
                Status = s.Status.ToString(),
                ItemsCount = s.Items.Count,
                CreatedAt = s.CreatedAt,
                CompletedAt = s.CompletedAt
            })
            .ToListAsync();
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