using FatooraRahatak.Application.DTOs.Admin;
namespace FatooraRahatak.Application.Interfaces;
public interface IAdminService
{
    Task<List<AdminStoreListDto>> GetAllStoresAsync();
    Task<AdminStoreDetailDto?> GetStoreByIdAsync(long id);
    Task SuspendStoreAsync(long id);
    Task ActivateStoreAsync(long id);
    Task ActivateCustomDomainAsync(long storeId);
    Task<List<AdminPackageDto>> GetAllPackagesAsync();
    Task<AdminPackageDto?> GetPackageByIdAsync(long id);
    Task UpdatePackageAsync(long id, UpdatePackageDto dto);
    // --- تاسك 11: إدارة المستخدمين على مستوى المنصة ---
    Task<List<AdminUserListDto>> GetAllUsersAsync();
    Task DeactivateUserAsync(long id, long currentUserId);
    Task ActivateUserAsync(long id);

    Task<AdminReportsOverviewDto> GetReportsOverviewAsync();
    Task<List<PlatformSettingDto>> GetSettingsAsync();
    Task UpdateSettingsAsync(UpdatePlatformSettingsDto dto);
}