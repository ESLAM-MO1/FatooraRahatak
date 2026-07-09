using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.DTOs.Orders;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class OrderService : IOrderService
{
    private readonly AppDbContext _context;

    public OrderService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OrderConfirmationDto> CheckoutAsync(string slug, long? customerId, CheckoutRequestDto dto)
    {
        // نفس فلتر "المتجر النشط" المستخدم في PublicStoreService بالظبط
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);

        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        // ⚠️ إضافة تاسك 2 (معلم 6): إغلاق آخر ثغرة في فحص "المتجر معطّل" —
        // بدون هذا الشرط، كان بالإمكان إتمام الشراء فعليًا حتى لو IsOnline = false
        if (!store.IsOnline)
            throw new InvalidOperationException("المتجر غير متاح حاليًا، لا يمكن إتمام الطلب");

        if (string.IsNullOrWhiteSpace(dto.SessionId))
            throw new InvalidOperationException("جلسة السلة غير صالحة");

        if (string.IsNullOrWhiteSpace(dto.ShippingAddress))
            throw new InvalidOperationException("عنوان الشحن مطلوب");

        // خطوة 1: نفس آلية CartService الفعلية (StoreId + SessionId + Status == Active)
        var cart = await _context.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.StoreId == store.Id && c.SessionId == dto.SessionId && c.Status == CartStatus.Active);

        // خطوة 2: سلة فارغة أو غير موجودة
        if (cart == null || cart.Items.Count == 0)
            throw new InvalidOperationException("السلة فارغة، لا يمكن إتمام الطلب");

        // ضيف أم عميل مسجّل؟
        if (customerId == null)
        {
            if (string.IsNullOrWhiteSpace(dto.GuestName) || string.IsNullOrWhiteSpace(dto.GuestPhone))
                throw new InvalidOperationException("الاسم ورقم الهاتف مطلوبان لإتمام الطلب كزائر");
        }

        // خطوة 3: تحقق من توفر المخزون الفعلي لكل عنصر (تجميع عبر كل المستودعات المطابقة)
        var stockRowsPerItem = new Dictionary<long, List<Domain.Entities.Inventory.InventoryStock>>();

        foreach (var item in cart.Items)
        {
            var stockRows = await _context.InventoryStocks
                .Include(s => s.Warehouse)
                .Where(s => s.ProductId == item.ProductId
                            && s.VariantId == item.VariantId
                            && s.Warehouse.StoreId == store.Id)
                .ToListAsync();

            var totalAvailable = stockRows.Sum(s => s.QuantityAvailable);
            if (totalAvailable < item.Quantity)
                throw new InvalidOperationException($"الكمية المتوفرة من المنتج \"{item.Product.NameAr}\" غير كافية لإتمام الطلب");

            stockRowsPerItem[item.Id] = stockRows;
        }

        // خطوة 5 (جزء أول): SubTotal
        var subTotal = cart.Items.Sum(i => i.PriceAtAdd * i.Quantity);

        // الكوبون المطبق على السلة (لو موجود) — آخر CouponUsage مسجّلة على هذه السلة
        var couponUsage = await _context.CouponUsages
            .Include(u => u.Coupon)
            .Where(u => u.CartId == cart.Id)
            .OrderByDescending(u => u.Id)
            .FirstOrDefaultAsync();

        decimal discountAmount = 0;
        Coupon? appliedCoupon = null;

        if (couponUsage != null)
        {
            appliedCoupon = couponUsage.Coupon;

            // ⚠️ إضافة متفق عليها (خارج نص تاسك 5 الحرفي): إغلاق فجوة تاسك 2
            // التحقق من حد الاستخدام لكل عميل قبل تثبيت الكوبون على الطلب
            var otherUsagesQuery = _context.CouponUsages
                .Where(u => u.CouponId == appliedCoupon.Id && u.Id != couponUsage.Id);

            int previousUsagesByThisCustomer;
            if (customerId != null)
            {
                previousUsagesByThisCustomer = await otherUsagesQuery.CountAsync(u => u.CustomerId == customerId);
            }
            else
            {
                previousUsagesByThisCustomer = await otherUsagesQuery.CountAsync(u => u.GuestPhone == dto.GuestPhone);
            }

            if (previousUsagesByThisCustomer >= appliedCoupon.UsageLimitPerCustomer)
                throw new InvalidOperationException("لقد تجاوزت الحد المسموح لاستخدام هذا الكوبون");

            discountAmount = appliedCoupon.DiscountType == DiscountType.Percentage
                ? subTotal * (appliedCoupon.DiscountValue / 100)
                : appliedCoupon.DiscountValue;

            discountAmount = Math.Min(discountAmount, subTotal);
        }

        var totalAmount = subTotal - discountAmount;

        // --- بداية مرحلة الكتابة الفعلية (Transaction) ---
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // خطوة 6: إنشاء Order
            var orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";

            var order = new Order
            {
                OrderNumber = orderNumber,
                StoreId = store.Id,
                CustomerId = customerId,
                GuestName = customerId == null ? dto.GuestName : null,
                GuestPhone = customerId == null ? dto.GuestPhone : null,
                GuestEmail = customerId == null ? dto.GuestEmail : null,
                ShippingAddress = dto.ShippingAddress,
                Status = OrderStatus.New,
                SubTotal = subTotal,
                DiscountAmount = discountAmount,
                TotalAmount = totalAmount,
                CouponId = appliedCoupon?.Id,
                Notes = dto.Notes
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // خطوة 6 (تابع): OrderItems بـ Snapshot للاسم والسعر
            foreach (var item in cart.Items)
            {
                _context.OrderItems.Add(new OrderItem
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = item.Product.NameAr,
                    Quantity = item.Quantity,
                    UnitPriceSnapshot = item.PriceAtAdd,
                    LineTotal = item.PriceAtAdd * item.Quantity
                });
            }

            // خطوة 7: أول سجل حالة
            _context.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                Status = OrderStatus.New,
                ChangedByUserId = customerId,
                ChangedAt = DateTime.UtcNow
            });

            // خطوة 8: خصم الكمية فعليًا من كل المستودعات المطابقة (توزيع تلقائي)
            foreach (var item in cart.Items)
            {
                var remaining = item.Quantity;
                foreach (var stock in stockRowsPerItem[item.Id])
                {
                    if (remaining <= 0) break;
                    var deduct = Math.Min(stock.QuantityAvailable, remaining);
                    stock.QuantityAvailable -= deduct;
                    remaining -= deduct;
                }
            }

            // خطوة 9: تسجيل الاستخدام الفعلي للكوبون (تحديث السجل الموجود بهوية العميل/الضيف)
            if (couponUsage != null)
            {
                couponUsage.CustomerId = customerId;
                couponUsage.GuestPhone = customerId == null ? dto.GuestPhone : null;
            }

            // خطوة 10: مسح السلة (حذف العناصر فعليًا)
            _context.CartItems.RemoveRange(cart.Items);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            // خطوة 12: إرجاع تأكيد الطلب
            return new OrderConfirmationDto
            {
                OrderNumber = order.OrderNumber,
                TotalAmount = order.TotalAmount,
                Status = order.Status.ToString()
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // --- تاسك 6: إدارة الطلبات لصاحب المتجر ---

    public async Task<List<OwnerOrderListDto>> GetOwnerOrdersAsync(long storeId, string? status)
    {
        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Where(o => o.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<OrderStatus>(status, true, out var statusEnum))
                throw new InvalidOperationException("حالة الطلب غير صحيحة");

            query = query.Where(o => o.Status == statusEnum);
        }

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        return orders.Select(o => new OwnerOrderListDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CustomerName = o.CustomerId != null ? o.Customer!.FullName : (o.GuestName ?? "غير معروف"),
            TotalAmount = o.TotalAmount,
            Status = o.Status.ToString(),
            ItemsCount = o.Items.Count,
            CreatedAt = o.CreatedAt
        }).ToList();
    }

    public async Task<OwnerOrderDetailDto?> GetOwnerOrderDetailAsync(long storeId, long orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.StatusHistory)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);

        if (order == null) return null;

        return new OwnerOrderDetailDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = order.CustomerId != null ? order.Customer!.FullName : (order.GuestName ?? "غير معروف"),
            CustomerPhone = order.CustomerId != null ? order.Customer!.Phone : order.GuestPhone,
            CustomerEmail = order.CustomerId != null ? order.Customer!.Email : order.GuestEmail,
            IsGuest = order.CustomerId == null,
            ShippingAddress = order.ShippingAddress,
            Notes = order.Notes,
            Status = order.Status.ToString(),
            SubTotal = order.SubTotal,
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.TotalAmount,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new OwnerOrderItemDto
            {
                ProductId = i.ProductId,
                ProductNameSnapshot = i.ProductNameSnapshot,
                Quantity = i.Quantity,
                UnitPriceSnapshot = i.UnitPriceSnapshot,
                LineTotal = i.LineTotal
            }).ToList(),
            StatusHistory = order.StatusHistory
                .OrderBy(h => h.ChangedAt)
                .Select(h => new OwnerOrderStatusHistoryDto
                {
                    Status = h.Status.ToString(),
                    ChangedAt = h.ChangedAt
                }).ToList()
        };
    }

    public async Task UpdateOrderStatusAsync(long storeId, long orderId, long? changedByUserId, string newStatus)
    {
        if (!Enum.TryParse<OrderStatus>(newStatus, true, out var statusEnum))
            throw new InvalidOperationException("حالة الطلب غير صحيحة");

        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        order.Status = statusEnum;
        order.UpdatedAt = DateTime.UtcNow;

        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = statusEnum,
            ChangedByUserId = changedByUserId,
            ChangedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();
    }
}