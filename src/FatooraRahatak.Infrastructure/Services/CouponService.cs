using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Sales;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class CouponService : ICouponService
{
    private readonly AppDbContext _context;

    public CouponService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CouponResponseDto> CreateAsync(long storeId, CreateCouponDto dto)
    {
        if (!Enum.TryParse<DiscountType>(dto.DiscountType, out var discountType))
            throw new InvalidOperationException("نوع الخصم غير صحيح");

        // ⚠️ منع كوبونات "الخصم السالب" التي ترفع سعر الطلب بدل خفضه
        if (dto.DiscountValue <= 0)
            throw new InvalidOperationException("قيمة الخصم يجب أن تكون أكبر من صفر");
        if (dto.MinOrderAmount < 0)
            throw new InvalidOperationException("الحد الأدنى للطلب لا يمكن أن يكون سالبًا");

        var codeExists = await _context.Coupons.AnyAsync(c => c.StoreId == storeId && c.Code == dto.Code);
        if (codeExists)
            throw new InvalidOperationException("كود الخصم مستخدم بالفعل");

        if (dto.ValidUntil <= dto.ValidFrom)
            throw new InvalidOperationException("تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية");

        var coupon = new Coupon
        {
            StoreId = storeId,
            Code = dto.Code,
            DiscountType = discountType,
            DiscountValue = dto.DiscountValue,
            UsageLimitTotal = dto.UsageLimitTotal,
            UsageLimitPerCustomer = dto.UsageLimitPerCustomer,
            MinOrderAmount = dto.MinOrderAmount,
            ValidFrom = dto.ValidFrom,
            ValidUntil = dto.ValidUntil,
            IsActive = true
        };

        _context.Coupons.Add(coupon);
        await _context.SaveChangesAsync();

        return MapToDto(coupon);
    }

    public async Task<List<CouponResponseDto>> GetAllAsync(long storeId)
    {
        return await _context.Coupons
            .Where(c => c.StoreId == storeId)
            .Select(c => new CouponResponseDto
            {
                Id = c.Id,
                Code = c.Code,
                DiscountType = c.DiscountType.ToString(),
                DiscountValue = c.DiscountValue,
                UsageLimitTotal = c.UsageLimitTotal,
                MinOrderAmount = c.MinOrderAmount,
                ValidFrom = c.ValidFrom,
                ValidUntil = c.ValidUntil,
                IsActive = c.IsActive
            })
            .ToListAsync();
    }

    public async Task DeactivateAsync(long storeId, long couponId)
    {
        var coupon = await _context.Coupons.FirstOrDefaultAsync(c => c.Id == couponId && c.StoreId == storeId);
        if (coupon == null)
            throw new InvalidOperationException("الكوبون غير موجود");

        coupon.IsActive = false;
        await _context.SaveChangesAsync();
    }

    private static CouponResponseDto MapToDto(Coupon c) => new()
    {
        Id = c.Id,
        Code = c.Code,
        DiscountType = c.DiscountType.ToString(),
        DiscountValue = c.DiscountValue,
        UsageLimitTotal = c.UsageLimitTotal,
        MinOrderAmount = c.MinOrderAmount,
        ValidFrom = c.ValidFrom,
        ValidUntil = c.ValidUntil,
        IsActive = c.IsActive
    };
}