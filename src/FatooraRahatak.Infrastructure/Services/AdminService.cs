using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Domain.Entities.Platform;
namespace FatooraRahatak.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;

    public AdminService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<AdminStoreListDto>> GetAllStoresAsync()
    {
        return await _context.Stores
            .Include(s => s.Owner)
            .Include(s => s.Package)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new AdminStoreListDto
            {
                Id = s.Id,
                StoreName = s.StoreName,
                StoreSlug = s.StoreSlug,
                OwnerName = s.Owner.FullName,
                OwnerEmail = s.Owner.Email,
                PackageName = s.Package.PackageName,
                Status = s.Status.ToString(),
                CreatedAt = s.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<AdminStoreDetailDto?> GetStoreByIdAsync(long id)
    {
        var store = await _context.Stores
            .Include(s => s.Owner)
            .Include(s => s.Package)
            .Include(s => s.Products)
            .Include(s => s.Employees)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (store == null) return null;

        return new AdminStoreDetailDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            OwnerName = store.Owner.FullName,
            OwnerEmail = store.Owner.Email,
            PackageName = store.Package.PackageName,
            Status = store.Status.ToString(),
            CreatedAt = store.CreatedAt,
            ProductsCount = store.Products.Count,
            EmployeesCount = store.Employees.Count(e => e.Status == "Active"),
            CustomDomain = store.CustomDomain,
            CustomDomainStatus = store.CustomDomainStatus.ToString()
        };
    }

    public async Task SuspendStoreAsync(long id)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == id);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        store.Status = StoreStatus.Suspended;
        await _context.SaveChangesAsync();
    }

    public async Task ActivateStoreAsync(long id)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == id);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        store.Status = StoreStatus.Active;
        await _context.SaveChangesAsync();
    }

    public async Task ActivateCustomDomainAsync(long storeId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (string.IsNullOrWhiteSpace(store.CustomDomain))
            throw new InvalidOperationException("لا يوجد دومين خاص مطلوب لهذا المتجر");

        store.CustomDomainStatus = CustomDomainStatus.Active;
        await _context.SaveChangesAsync();
    }

    public async Task<List<AdminPackageDto>> GetAllPackagesAsync()
    {
        return await _context.Packages
            .OrderBy(p => p.Id)
            .Select(p => new AdminPackageDto
            {
                Id = p.Id,
                PackageName = p.PackageName,
                MonthlyPrice = p.MonthlyPrice,
                MaxProducts = p.MaxProducts,
                MaxOrdersPerMonth = p.MaxOrdersPerMonth,
                MaxEmployees = p.MaxEmployees,
                MaxWarehouses = p.MaxWarehouses,
                MaxBranchesPOS = p.MaxBranchesPOS,
                MaxPaymentGateways = p.MaxPaymentGateways,
                MaxShippingCompanies = p.MaxShippingCompanies,
                HasAccountingFull = p.HasAccountingFull,
                HasPayroll = p.HasPayroll,
                HasZatcaInvoice = p.HasZatcaInvoice,
                HasCustomDomain = p.HasCustomDomain,
                HasAffiliateMarketing = p.HasAffiliateMarketing,
                HasApiAccess = p.HasApiAccess,
                IsActive = p.IsActive
            })
            .ToListAsync();
    }

    public async Task<AdminPackageDto?> GetPackageByIdAsync(long id)
    {
        var package = await _context.Packages.FirstOrDefaultAsync(p => p.Id == id);
        if (package == null) return null;

        return new AdminPackageDto
        {
            Id = package.Id,
            PackageName = package.PackageName,
            MonthlyPrice = package.MonthlyPrice,
            MaxProducts = package.MaxProducts,
            MaxOrdersPerMonth = package.MaxOrdersPerMonth,
            MaxEmployees = package.MaxEmployees,
            MaxWarehouses = package.MaxWarehouses,
            MaxBranchesPOS = package.MaxBranchesPOS,
            MaxPaymentGateways = package.MaxPaymentGateways,
            MaxShippingCompanies = package.MaxShippingCompanies,
            HasAccountingFull = package.HasAccountingFull,
            HasPayroll = package.HasPayroll,
            HasZatcaInvoice = package.HasZatcaInvoice,
            HasCustomDomain = package.HasCustomDomain,
            HasAffiliateMarketing = package.HasAffiliateMarketing,
            HasApiAccess = package.HasApiAccess,
            IsActive = package.IsActive
        };
    }

    public async Task UpdatePackageAsync(long id, UpdatePackageDto dto)
    {
        var package = await _context.Packages.FirstOrDefaultAsync(p => p.Id == id);
        if (package == null)
            throw new InvalidOperationException("الباقة غير موجودة");

        // Prevent changing PackageName - system designed with 4 fixed packages
        package.MonthlyPrice = dto.MonthlyPrice;
        package.MaxProducts = dto.MaxProducts;
        package.MaxOrdersPerMonth = dto.MaxOrdersPerMonth;
        package.MaxEmployees = dto.MaxEmployees;
        package.MaxWarehouses = dto.MaxWarehouses;
        package.MaxBranchesPOS = dto.MaxBranchesPOS;
        package.MaxPaymentGateways = dto.MaxPaymentGateways;
        package.MaxShippingCompanies = dto.MaxShippingCompanies;
        package.HasAccountingFull = dto.HasAccountingFull;
        package.HasPayroll = dto.HasPayroll;
        package.HasZatcaInvoice = dto.HasZatcaInvoice;
        package.HasCustomDomain = dto.HasCustomDomain;
        package.HasAffiliateMarketing = dto.HasAffiliateMarketing;
        package.HasApiAccess = dto.HasApiAccess;
        package.IsActive = dto.IsActive;

        await _context.SaveChangesAsync();
    }



    public async Task<List<AdminUserListDto>> GetAllUsersAsync()
    {
        return await _context.Users
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new AdminUserListDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                UserType = u.UserType.ToString(),
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task DeactivateUserAsync(long id, long currentUserId)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        if (user.Id == currentUserId)
            throw new InvalidOperationException("لا يمكنك تعطيل حسابك الخاص");

        if (user.UserType == UserType.SuperAdmin)
            throw new InvalidOperationException("لا يمكن تعطيل حساب سوبر أدمن آخر");

        user.IsActive = false;
        await _context.SaveChangesAsync();
    }

    public async Task ActivateUserAsync(long id)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        user.IsActive = true;
        await _context.SaveChangesAsync();
    }
    // --- تاسك 13: التقارير والإعدادات العامة للمنصة ---

    public async Task<AdminReportsOverviewDto> GetReportsOverviewAsync()
    {
        var totalStores = await _context.Stores.CountAsync();
        var activeStores = await _context.Stores.CountAsync(s => s.Status == StoreStatus.Active);
        var suspendedStores = await _context.Stores.CountAsync(s => s.Status == StoreStatus.Suspended);
        var totalUsers = await _context.Users.CountAsync();
        var totalProducts = await _context.Products.CountAsync();

        var storesByPackage = await _context.Stores
            .Include(s => s.Package)
            .GroupBy(s => s.Package.PackageName)
            .Select(g => new StoreCountByPackageDto
            {
                PackageName = g.Key,
                Count = g.Count()
            })
            .ToListAsync();

        return new AdminReportsOverviewDto
        {
            TotalStores = totalStores,
            ActiveStores = activeStores,
            SuspendedStores = suspendedStores,
            TotalUsers = totalUsers,
            TotalProductsAcrossPlatform = totalProducts,
            StoresByPackage = storesByPackage
        };
    }

    public async Task<List<PlatformSettingDto>> GetSettingsAsync()
    {
        return await _context.PlatformSettings
            .OrderBy(s => s.SettingKey)
            .Select(s => new PlatformSettingDto
            {
                SettingKey = s.SettingKey,
                SettingValue = s.SettingValue
            })
            .ToListAsync();
    }

    public async Task UpdateSettingsAsync(UpdatePlatformSettingsDto dto)
    {
        foreach (var item in dto.Settings)
        {
            var existing = await _context.PlatformSettings
                .FirstOrDefaultAsync(s => s.SettingKey == item.SettingKey);

            if (existing == null)
            {
                _context.PlatformSettings.Add(new PlatformSetting
                {
                    SettingKey = item.SettingKey,
                    SettingValue = item.SettingValue,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                existing.SettingValue = item.SettingValue;
                existing.UpdatedAt = DateTime.UtcNow;
            }
        }

        await _context.SaveChangesAsync();
    }
}