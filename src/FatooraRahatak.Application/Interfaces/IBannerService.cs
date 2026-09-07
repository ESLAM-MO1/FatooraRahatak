using FatooraRahatak.Application.DTOs.Banners;

namespace FatooraRahatak.Application.Interfaces;

public interface IBannerService
{
    Task<List<BannerDto>> GetBannersAsync(long storeId);
    Task<BannerDto> CreateBannerAsync(long storeId, CreateBannerDto dto);
    Task<BannerDto?> UpdateBannerAsync(long storeId, long bannerId, UpdateBannerDto dto);
    Task<bool> DeleteBannerAsync(long storeId, long bannerId);
    Task<List<PublicBannerDto>> GetActiveBannersAsync(long storeId);
}
