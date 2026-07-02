using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Inventory;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class InventoryService : IInventoryService
{
    private readonly AppDbContext _context;

    public InventoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<WarehouseResponseDto> CreateWarehouseAsync(long storeId, CreateWarehouseDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var currentCount = await _context.Warehouses.CountAsync(w => w.StoreId == storeId);
        if (currentCount >= store.Package.MaxWarehouses)
            throw new InvalidOperationException($"وصلت للحد الأقصى لعدد المخازن في باقتك ({store.Package.MaxWarehouses}). قم بترقية باقتك.");

        var warehouse = new Warehouse
        {
            StoreId = storeId,
            WarehouseName = dto.WarehouseName,
            Address = dto.Address,
            IsDefault = false,
            IsActive = true
        };

        _context.Warehouses.Add(warehouse);
        await _context.SaveChangesAsync();

        return new WarehouseResponseDto
        {
            Id = warehouse.Id,
            WarehouseName = warehouse.WarehouseName,
            Address = warehouse.Address,
            IsDefault = warehouse.IsDefault,
            IsActive = warehouse.IsActive
        };
    }

    public async Task<List<WarehouseResponseDto>> GetWarehousesAsync(long storeId)
    {
        return await _context.Warehouses
            .Where(w => w.StoreId == storeId)
            .Select(w => new WarehouseResponseDto
            {
                Id = w.Id,
                WarehouseName = w.WarehouseName,
                Address = w.Address,
                IsDefault = w.IsDefault,
                IsActive = w.IsActive
            })
            .ToListAsync();
    }

    public async Task<List<StockItemDto>> GetStockAsync(long storeId, long? warehouseId, long? productId)
    {
        var query = _context.InventoryStocks
            .Include(s => s.Warehouse)
            .Include(s => s.Product)
            .Where(s => s.Warehouse.StoreId == storeId);

        if (warehouseId.HasValue)
            query = query.Where(s => s.WarehouseId == warehouseId.Value);

        if (productId.HasValue)
            query = query.Where(s => s.ProductId == productId.Value);

        return await query.Select(s => new StockItemDto
        {
            WarehouseId = s.WarehouseId,
            WarehouseName = s.Warehouse.WarehouseName,
            ProductId = s.ProductId,
            ProductNameAr = s.Product.NameAr,
            QuantityAvailable = s.QuantityAvailable,
            QuantityReserved = s.QuantityReserved,
            ReorderLevel = s.ReorderLevel
        }).ToListAsync();
    }

    public async Task<long> CreateStockTransferAsync(long storeId, long userId, CreateStockTransferDto dto)
    {
        var fromWarehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.FromWarehouseId && w.StoreId == storeId);
        var toWarehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.ToWarehouseId && w.StoreId == storeId);

        if (fromWarehouse == null || toWarehouse == null)
            throw new InvalidOperationException("أحد المخازن غير موجود");

        if (dto.FromWarehouseId == dto.ToWarehouseId)
            throw new InvalidOperationException("لا يمكن التحويل لنفس المخزن");

        foreach (var item in dto.Items)
        {
            var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
                s.WarehouseId == dto.FromWarehouseId && s.ProductId == item.ProductId && s.VariantId == item.VariantId);

            if (stock == null || stock.QuantityAvailable < item.Quantity)
                throw new InvalidOperationException($"الكمية المتاحة غير كافية للمنتج رقم {item.ProductId}");
        }

        var transfer = new StockTransfer
        {
            FromWarehouseId = dto.FromWarehouseId,
            ToWarehouseId = dto.ToWarehouseId,
            Status = StockTransferStatus.Pending,
            RequestedByUserId = userId
        };

        _context.StockTransfers.Add(transfer);
        await _context.SaveChangesAsync();

        foreach (var item in dto.Items)
        {
            _context.StockTransferItems.Add(new StockTransferItem
            {
                TransferId = transfer.Id,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                Quantity = item.Quantity
            });

            var stock = await _context.InventoryStocks.FirstAsync(s =>
                s.WarehouseId == dto.FromWarehouseId && s.ProductId == item.ProductId && s.VariantId == item.VariantId);
            stock.QuantityReserved += item.Quantity;
        }

        await _context.SaveChangesAsync();
        return transfer.Id;
    }

    public async Task ApproveStockTransferAsync(long storeId, long transferId, long approvedByUserId)
    {
        var transfer = await _context.StockTransfers
            .Include(t => t.Items)
            .Include(t => t.FromWarehouse)
            .FirstOrDefaultAsync(t => t.Id == transferId && t.FromWarehouse.StoreId == storeId);

        if (transfer == null)
            throw new InvalidOperationException("طلب التحويل غير موجود");

        if (transfer.Status != StockTransferStatus.Pending)
            throw new InvalidOperationException("طلب التحويل تمت معالجته بالفعل");

        foreach (var item in transfer.Items)
        {

            var fromStock = await _context.InventoryStocks.FirstAsync(s =>
                s.WarehouseId == transfer.FromWarehouseId && s.ProductId == item.ProductId && s.VariantId == item.VariantId);
            fromStock.QuantityAvailable -= item.Quantity;
            fromStock.QuantityReserved -= item.Quantity;

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                WarehouseId = transfer.FromWarehouseId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                TransactionType = InventoryTransactionType.TransferOut,
                Quantity = -item.Quantity,
                ReferenceType = "Transfer",
                ReferenceId = transfer.Id,
                CreatedByUserId = approvedByUserId
            });

            var toStock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
                s.WarehouseId == transfer.ToWarehouseId && s.ProductId == item.ProductId && s.VariantId == item.VariantId);

            if (toStock == null)
            {
                toStock = new InventoryStock
                {
                    WarehouseId = transfer.ToWarehouseId,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    QuantityAvailable = 0,
                    QuantityReserved = 0,
                    ReorderLevel = 0
                };
                _context.InventoryStocks.Add(toStock);
            }
            toStock.QuantityAvailable += item.Quantity;

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                WarehouseId = transfer.ToWarehouseId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                TransactionType = InventoryTransactionType.TransferIn,
                Quantity = item.Quantity,
                ReferenceType = "Transfer",
                ReferenceId = transfer.Id,
                CreatedByUserId = approvedByUserId
            });
        }

        transfer.Status = StockTransferStatus.Completed;
        transfer.ApprovedByUserId = approvedByUserId;
        transfer.CompletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<long> ReportDamagedStockAsync(long storeId, long userId, CreateDamagedStockDto dto)
    {
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.Id == dto.WarehouseId && w.StoreId == storeId);
        if (warehouse == null)
            throw new InvalidOperationException("المخزن غير موجود");

        var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
            s.WarehouseId == dto.WarehouseId && s.ProductId == dto.ProductId && s.VariantId == dto.VariantId);

        if (stock == null || stock.QuantityAvailable < dto.Quantity)
            throw new InvalidOperationException("الكمية المتاحة غير كافية");

        var damage = new DamagedStock
        {
            WarehouseId = dto.WarehouseId,
            ProductId = dto.ProductId,
            VariantId = dto.VariantId,
            Quantity = dto.Quantity,
            Reason = dto.Reason,
            ReportedByUserId = userId,
            IsApproved = false
        };

        _context.DamagedStocks.Add(damage);
        await _context.SaveChangesAsync();

        return damage.Id;
    }

    public async Task ApproveDamagedStockAsync(long storeId, long damageId, long approvedByUserId)
    {
        var damage = await _context.DamagedStocks
            .Include(d => d.Warehouse)
            .FirstOrDefaultAsync(d => d.Id == damageId && d.Warehouse.StoreId == storeId);

        if (damage == null)
            throw new InvalidOperationException("سجل التالف غير موجود");

        if (damage.IsApproved)
            throw new InvalidOperationException("تم اعتماد هذا السجل بالفعل");

        var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
            s.WarehouseId == damage.WarehouseId && s.ProductId == damage.ProductId && s.VariantId == damage.VariantId);

        if (stock == null || stock.QuantityAvailable < damage.Quantity)
            throw new InvalidOperationException("الكمية المتاحة غير كافية حاليًا لاعتماد هذا التلف");

        stock.QuantityAvailable -= damage.Quantity;

        _context.InventoryTransactions.Add(new InventoryTransaction
        {
            WarehouseId = damage.WarehouseId,
            ProductId = damage.ProductId,
            VariantId = damage.VariantId,
            TransactionType = InventoryTransactionType.Damage,
            Quantity = -damage.Quantity,
            ReferenceType = "DamagedStock",
            ReferenceId = damage.Id,
            CreatedByUserId = approvedByUserId
        });

        damage.IsApproved = true;
        damage.ApprovedByUserId = approvedByUserId;

        await _context.SaveChangesAsync();
    }
}