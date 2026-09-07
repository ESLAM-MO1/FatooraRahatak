using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Sales;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class CartService : ICartService
{
    private readonly AppDbContext _context;

    public CartService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CartResponseDto> AddItemAsync(long storeId, string sessionId, AddToCartDto dto)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == dto.ProductId && p.StoreId == storeId);
        if (product == null)
            throw new InvalidOperationException("المنتج غير موجود");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.StoreId == storeId && c.SessionId == sessionId && c.Status == CartStatus.Active);

        if (cart == null)
        {
            cart = new Cart
            {
                StoreId = storeId,
                SessionId = sessionId,
                Status = CartStatus.Active
            };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync();
        }

        var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == dto.ProductId && i.VariantId == dto.VariantId);

        // ⚠️ إصلاح سعر المتغيرات: كان يُتجاهل سعر المتغير (PriceAdjustment) ويُستخدم سعر المنتج
        // الأساسي فقط، فتدفع السلة سعرًا أقل/أعلى من الفعلي للمنتجات ذات المتغيرات.
        var effectivePrice = product.DiscountPrice ?? product.BasePrice;

        if (product.HasVariants)
        {
            if (!dto.VariantId.HasValue)
                throw new InvalidOperationException("هذا المنتج له متغيرات — يرجى اختيار المتغير المطلوب");

            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == dto.VariantId.Value && v.ProductId == product.Id && v.IsActive);
            if (variant == null)
                throw new InvalidOperationException("المتغير المحدد غير موجود أو غير متاح");

            effectivePrice += variant.PriceAdjustment;
        }

        if (existingItem != null)
        {
            existingItem.Quantity += dto.Quantity;
        }
        else
        {
            _context.CartItems.Add(new CartItem
            {
                CartId = cart.Id,
                ProductId = dto.ProductId,
                VariantId = dto.VariantId,
                Quantity = dto.Quantity,
                PriceAtAdd = effectivePrice
            });
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await BuildCartResponseAsync(cart.Id);
    }

    public async Task<CartResponseDto> GetCartAsync(long storeId, string sessionId)
    {
        var cart = await _context.Carts
            .FirstOrDefaultAsync(c => c.StoreId == storeId && c.SessionId == sessionId && c.Status == CartStatus.Active);

        if (cart == null)
            throw new InvalidOperationException("لا توجد سلة نشطة");

        return await BuildCartResponseAsync(cart.Id);
    }

    public async Task<CartResponseDto> UpdateItemAsync(long storeId, long cartItemId, UpdateCartItemDto dto)
    {
        var item = await _context.CartItems
            .Include(i => i.Cart)
            .FirstOrDefaultAsync(i => i.Id == cartItemId && i.Cart.StoreId == storeId);

        if (item == null)
            throw new InvalidOperationException("عنصر السلة غير موجود");

        if (dto.Quantity <= 0)
            throw new InvalidOperationException("الكمية يجب أن تكون أكبر من صفر");

        item.Quantity = dto.Quantity;
        item.Cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await BuildCartResponseAsync(item.CartId);
    }

    public async Task RemoveItemAsync(long storeId, long cartItemId)
    {
        var item = await _context.CartItems
            .Include(i => i.Cart)
            .FirstOrDefaultAsync(i => i.Id == cartItemId && i.Cart.StoreId == storeId);

        if (item == null)
            throw new InvalidOperationException("عنصر السلة غير موجود");

        _context.CartItems.Remove(item);
        item.Cart.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<decimal> ApplyCouponAsync(long storeId, ApplyCouponDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store != null && !store.IsCouponsEnabled)
            throw new InvalidOperationException("الخصومات غير مفعّلة في هذا المتجر حاليًا");

        var cart = await _context.Carts
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == dto.CartId && c.StoreId == storeId);

        if (cart == null)
            throw new InvalidOperationException("السلة غير موجودة");

        var coupon = await _context.Coupons
            .FirstOrDefaultAsync(c => c.StoreId == storeId && c.Code == dto.Code && c.IsActive);

        if (coupon == null)
            throw new InvalidOperationException("كود الخصم غير صحيح");

        if (DateTime.UtcNow < coupon.ValidFrom || DateTime.UtcNow > coupon.ValidUntil)
            throw new InvalidOperationException("كود الخصم منتهي الصلاحية أو لم يبدأ بعد");

        var subtotal = cart.Items.Sum(i => i.PriceAtAdd * i.Quantity);
        if (subtotal < coupon.MinOrderAmount)
            throw new InvalidOperationException($"الحد الأدنى للطلب لاستخدام هذا الكوبون هو {coupon.MinOrderAmount}");

        if (coupon.UsageLimitTotal.HasValue)
        {
            var totalUsages = await _context.CouponUsages.CountAsync(u => u.CouponId == coupon.Id);
            if (totalUsages >= coupon.UsageLimitTotal.Value)
                throw new InvalidOperationException("تم استنفاد عدد مرات استخدام هذا الكوبون");
        }

        var alreadyUsedOnCart = await _context.CouponUsages.AnyAsync(u => u.CouponId == coupon.Id && u.CartId == cart.Id);
        if (!alreadyUsedOnCart)
        {
            _context.CouponUsages.Add(new CouponUsage { CouponId = coupon.Id, CartId = cart.Id });
            await _context.SaveChangesAsync();
        }

        var discount = coupon.DiscountType == DiscountType.Percentage
            ? subtotal * (coupon.DiscountValue / 100)
            : coupon.DiscountValue;

        // ⚠️ دفاع إضافي: حتى لو وُجد كوبون بخصم سالب قديم في قاعدة البيانات، لا نسمح له برفع السعر
        return Math.Min(Math.Max(discount, 0m), subtotal); 
    }

    public async Task MarkAbandonedCartsAsync()
    {

        var cutoff = DateTime.UtcNow.AddHours(-24);

        var abandonedCarts = await _context.Carts
            .Where(c => c.Status == CartStatus.Active && c.UpdatedAt < cutoff)
            .ToListAsync();

        foreach (var cart in abandonedCarts)
        {
            cart.Status = CartStatus.Abandoned;

            // ⚠️ إصلاح استهلاك حد الكوبون: سلة مهجورة كان الكوبون مطبقًا عليها كانت تحجز من
            // حد الاستخدام الكلي حتى بعد التخلي عنها. حذف استخداماتها يعيد الحد للعملاء الفعليين.
            var usages = await _context.CouponUsages.Where(u => u.CartId == cart.Id).ToListAsync();
            _context.CouponUsages.RemoveRange(usages);
        }

        await _context.SaveChangesAsync();
    }

    private async Task<CartResponseDto> BuildCartResponseAsync(long cartId)
    {
        var cart = await _context.Carts.FirstAsync(c => c.Id == cartId);

        var items = await _context.CartItems
            .Include(i => i.Product)
            .Where(i => i.CartId == cartId)
            .Select(i => new CartItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductNameAr = i.Product.NameAr,
                VariantId = i.VariantId,
                Quantity = i.Quantity,
                PriceAtAdd = i.PriceAtAdd,
                LineTotal = i.PriceAtAdd * i.Quantity,
                Weight = i.Product.Weight
            })
            .ToListAsync();

        return new CartResponseDto
        {
            Id = cart.Id,
            Status = cart.Status.ToString(),
            Items = items,
            Subtotal = items.Sum(i => i.LineTotal),
            TotalWeightKg = items.Sum(i => i.Quantity * (i.Weight ?? 1))
        };
    }
}