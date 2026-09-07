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
    Task<RevenueDashboardDto> GetRevenueDashboardAsync();
    Task<List<PlatformInvoiceDto>> GetPlatformInvoicesAsync(bool? overdueOnly);
    Task<byte[]> ExportPlatformInvoicesExcelAsync();

    // --- إدارة المستخدمين الموسعة ---
    Task<List<AdminUserListDto>> GetOwnerUsersAsync();
    Task<StaffUserDto> CreateStaffUserAsync(CreateStaffDto dto);
    Task<List<StaffUserDto>> GetStaffUsersAsync();
    Task UpdateUserAsync(long id, UpdateUserDto dto, long adminUserId);
    Task UpdateStaffUserAsync(long id, UpdateStaffDto dto, long adminUserId);
    Task DeleteStaffUserAsync(long id, long adminUserId);

    Task LogAuditActionAsync(long adminUserId, string adminName, string action, string? targetType = null, string? targetId = null, string? details = null, string? ipAddress = null);

    // --- الإشعارات المركزية ---
    Task SendPlatformNotificationAsync(SendNotificationDto dto, long adminUserId);

    // --- إدارة الثيمات ---
    Task<List<AdminThemeDto>> GetThemesAsync();
    Task SetThemeEnabledAsync(long id, bool isEnabled);
}