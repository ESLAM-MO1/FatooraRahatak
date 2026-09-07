using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class OrderStockService : IOrderStockService
{
    private readonly AppDbContext _context;

    public OrderStockService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// خصم كميات الطلب من المخزون داخل معاملة مع قفل على مستوى الصف (UPDLOCK):
    /// قراءة وخصم المخزون يتمان معًا، وطلبان متزامنان على آخر قطعة لا يمرّ كلاهما
    /// (الثاني ينتظر القفل ثم يجد الكمية غير كافية فيُرفض).
    /// </summary>
    public async Task DeductStockAsync(Order order, long? userId = null)
    {
        foreach (var item in order.Items)
        {
            var remaining = item.Quantity;
            long stockWarehouseId = 0;
            var lockedRows = await LockStockRowsAsync(order.StoreId, item.ProductId, item.VariantId);
            foreach (var stock in lockedRows)
            {
                if (remaining <= 0) break;
                var deduct = Math.Min(stock.QuantityAvailable, remaining);
                stock.QuantityAvailable -= deduct;
                remaining -= deduct;
                stockWarehouseId = stock.WarehouseId;
            }

            if (remaining > 0)
                throw new InvalidOperationException("الكمية المتوفرة من المنتج غير كافية لإتمام الطلب");

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                WarehouseId = stockWarehouseId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                TransactionType = InventoryTransactionType.Sale,
                Quantity = -item.Quantity,
                ReferenceType = "Order",
                ReferenceId = order.Id,
                CreatedByUserId = userId
            });
        }

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// إعادة الكمية إلى المخزون (عكس الخصم عند تأكيد البيع): تُضاف إلى أول رصيد
    /// مطابق في مخزن المتجر، مع إنشاء حركة Return.
    /// </summary>
    public async Task RestockAsync(Order order, long? userId = null)
    {
        foreach (var item in order.Items)
        {
            var stock = await _context.InventoryStocks
                .Include(s => s.Warehouse)
                .FirstOrDefaultAsync(s => s.ProductId == item.ProductId
                    && s.VariantId == item.VariantId
                    && s.Warehouse.StoreId == order.StoreId);

            if (stock == null)
            {
                var warehouse = await _context.Warehouses
                    .FirstOrDefaultAsync(w => w.StoreId == order.StoreId);
                if (warehouse == null)
                {
                    warehouse = new Warehouse
                    {
                        StoreId = order.StoreId,
                        WarehouseName = "المستودع الرئيسي",
                        IsDefault = true
                    };
                    _context.Warehouses.Add(warehouse);
                    await _context.SaveChangesAsync();
                }

                stock = new InventoryStock
                {
                    WarehouseId = warehouse.Id,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    QuantityAvailable = item.Quantity,
                    QuantityReserved = 0
                };
                _context.InventoryStocks.Add(stock);
                await _context.SaveChangesAsync();
            }
            else
            {
                stock.QuantityAvailable += item.Quantity;
            }

            _context.InventoryTransactions.Add(new InventoryTransaction
            {
                WarehouseId = stock.WarehouseId,
                ProductId = item.ProductId,
                VariantId = item.VariantId,
                TransactionType = InventoryTransactionType.Return,
                Quantity = item.Quantity,
                ReferenceType = "Order",
                ReferenceId = order.Id,
                CreatedByUserId = userId
            });
        }
    }

    private async Task<List<InventoryStock>> LockStockRowsAsync(long storeId, long productId, long? variantId)
    {
        var warehouseSubquery = "SELECT Id FROM Warehouses WHERE StoreId = {1}";
        return await _context.InventoryStocks
            .FromSqlRaw(
                "SELECT * FROM InventoryStocks WITH (UPDLOCK, ROWLOCK) " +
                "WHERE ProductId = {0} AND WarehouseId IN (" + warehouseSubquery + ") " +
                "AND (VariantId = {2} OR (VariantId IS NULL AND {2} IS NULL))",
                productId, storeId, variantId)
            .Include(s => s.Warehouse)
            .ToListAsync();
    }
}
