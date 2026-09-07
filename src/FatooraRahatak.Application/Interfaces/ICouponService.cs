using FatooraRahatak.Application.DTOs.Sales;

namespace FatooraRahatak.Application.Interfaces;

public interface ICouponService
{
    Task<CouponResponseDto> CreateAsync(long storeId, CreateCouponDto dto);
    Task<List<CouponResponseDto>> GetAllAsync(long storeId);
    Task DeactivateAsync(long storeId, long couponId);
}