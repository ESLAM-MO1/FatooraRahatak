using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Audit;
using FatooraRahatak.Domain.Entities.Affiliates;
using ClosedXML.Excel;
using Microsoft.Extensions.Options;
using FatooraRahatak.Application.Common;
namespace FatooraRahatak.Infrastructure.Services;

public class AdminService : IAdminService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly JwtSettings _jwtSettings;

    public AdminService(AppDbContext context, INotificationService notificationService, IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _notificationService = notificationService;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<List<AdminStoreListDto>> GetAllStoresAsync()
    {
        const int Unlimited = -1;

        var raw = await _context.Stores
            .Include(s => s.Owner)
            .Include(s => s.Package)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new
            {
                s.Id,
                s.StoreName,
                s.StoreSlug,
                OwnerName = s.Owner.FullName,
                OwnerEmail = s.Owner.Email,
                PackageName = s.Package.PackageName,
                Status = s.Status.ToString(),
                s.CreatedAt,
                s.Package.MaxProducts,
                s.Package.MaxEmployees,
                s.Package.MaxWarehouses,
                s.Package.MaxOrdersPerMonth,
                ProductsCount = s.Products.Count,
                EmployeesCount = s.Employees.Count(e => e.Status == "Active"),
                WarehousesCount = s.Warehouses.Count,
                OrdersCount = _context.Orders.Count(o => o.StoreId == s.Id)
            })
            .ToListAsync();

        return raw.Select(s =>
        {
            var ratios = new List<double>();

            if (s.MaxProducts.HasValue && s.MaxProducts.Value > 1)
                ratios.Add((double)s.ProductsCount / s.MaxProducts.Value * 100);
            if (s.MaxEmployees > 1 && s.MaxEmployees != Unlimited)
                ratios.Add((double)s.EmployeesCount / s.MaxEmployees * 100);
            if (s.MaxWarehouses > 1 && s.MaxWarehouses != Unlimited)
                ratios.Add((double)s.WarehousesCount / s.MaxWarehouses * 100);
            if (s.MaxOrdersPerMonth.HasValue && s.MaxOrdersPerMonth.Value > 1)
                ratios.Add((double)s.OrdersCount / s.MaxOrdersPerMonth.Value * 100);

            return new AdminStoreListDto
            {
                Id = s.Id,
                StoreName = s.StoreName,
                StoreSlug = s.StoreSlug,
                OwnerName = s.OwnerName,
                OwnerEmail = s.OwnerEmail,
                PackageName = s.PackageName,
                Status = s.Status,
                CreatedAt = s.CreatedAt,
                PackageConsumptionPercent = ratios.Count > 0 ? Math.Round(ratios.Max(), 1) : 0
            };
        }).ToList();
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

    public async Task<List<AdminUserListDto>> GetOwnerUsersAsync()
    {
        return await _context.Users
            .Where(u => u.UserType == UserType.Owner)
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

    public async Task<StaffUserDto> CreateStaffUserAsync(CreateStaffDto dto)
    {
        var existing = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (existing != null)
            throw new InvalidOperationException("البريد الإلكتروني مستخدم بالفعل");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = null,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            UserType = UserType.SupportStaff,
            IsActive = true,
            IsVerified = true
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return new StaffUserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            RoleType = dto.RoleType,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt
        };
    }

    public async Task<List<StaffUserDto>> GetStaffUsersAsync()
    {
        return await _context.Users
            .Where(u => u.UserType == UserType.SupportStaff)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new StaffUserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                RoleType = "Support",
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt
            })
            .ToListAsync();
    }

    public async Task LogAuditActionAsync(long adminUserId, string adminName, string action, string? targetType = null, string? targetId = null, string? details = null, string? ipAddress = null)
    {
        var log = new AuditLog
        {
            AdminUserId = adminUserId,
            AdminName = adminName,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            Details = details,
            IpAddress = ipAddress
        };
        _context.Set<AuditLog>().Add(log);
        await _context.SaveChangesAsync();
    }

    public async Task SendPlatformNotificationAsync(SendNotificationDto dto, long adminUserId)
    {
        if (dto.RecipientType == "Specific" && (!dto.StoreId.HasValue))
            throw new InvalidOperationException("يرجى تحديد المتجر");

        var admin = await _context.Users.FirstOrDefaultAsync(u => u.Id == adminUserId)
            ?? throw new InvalidOperationException("المدير غير موجود");

        List<long> targetUserIds;

        if (dto.RecipientType == "All")
        {
            targetUserIds = await _context.Users
                .Where(u => u.UserType == UserType.Owner || u.UserType == UserType.Employee)
                .Select(u => u.Id)
                .ToListAsync();
        }
        else
        {
            var store = await _context.Stores
                .Include(s => s.Employees)
                .FirstOrDefaultAsync(s => s.Id == dto.StoreId)
                ?? throw new InvalidOperationException("المتجر غير موجود");

            targetUserIds = new List<long> { store.OwnerUserId };
            targetUserIds.AddRange(store.Employees.Select(e => e.UserId));
        }

        var notifType = dto.Type switch
        {
            "Maintenance" => NotificationType.General,
            "Offer" => NotificationType.General,
            _ => NotificationType.General
        };

        foreach (var uid in targetUserIds)
        {
            await _notificationService.CreateAsync(uid, dto.Title, dto.Message, notifType);
        }

        await LogAuditActionAsync(adminUserId, admin.FullName, "SendNotification", "Platform", null,
            $"إرسال إشعار {(dto.RecipientType == "All" ? "للجميع" : $"للمتجر {dto.StoreId}")}: {dto.Title}", null);
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

        try
        {
            await _notificationService.CreateAsync(
                store.OwnerUserId,
                "تم تفعيل الدومين الخاص",
                $"تم تفعيل الدومين {store.CustomDomain} لمتجرك بنجاح",
                NotificationType.DomainActivated,
                "/dashboard/store-settings");
        }
        catch { }
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
                HasPos = p.HasPos,
                HasLogo = p.HasLogo,
                MaxThemes = p.MaxThemes,
                CommissionPercentage = p.CommissionPercentage,
                Color = p.Color,
                HasShippingIntegration = p.HasShippingIntegration,
                HasShippingCalculator = p.HasShippingCalculator,
                HasShippingTracking = p.HasShippingTracking,
                HasShippingLabelPrinting = p.HasShippingLabelPrinting,
                HasFreeShipping = p.HasFreeShipping,
                HasCashOnDelivery = p.HasCashOnDelivery,
                HasShippingDiscounts = p.HasShippingDiscounts,
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
            HasPos = package.HasPos,
            HasLogo = package.HasLogo,
            MaxThemes = package.MaxThemes,
            CommissionPercentage = package.CommissionPercentage,
            Color = package.Color,
            HasShippingIntegration = package.HasShippingIntegration,
            HasShippingCalculator = package.HasShippingCalculator,
            HasShippingTracking = package.HasShippingTracking,
            HasShippingLabelPrinting = package.HasShippingLabelPrinting,
            HasFreeShipping = package.HasFreeShipping,
            HasCashOnDelivery = package.HasCashOnDelivery,
            HasShippingDiscounts = package.HasShippingDiscounts,
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
        package.HasPos = dto.HasPos;
        package.HasLogo = dto.HasLogo;
        package.MaxThemes = dto.MaxThemes;
        package.CommissionPercentage = dto.CommissionPercentage;
        package.Color = dto.Color;
        package.HasShippingIntegration = dto.HasShippingIntegration;
        package.HasShippingCalculator = dto.HasShippingCalculator;
        package.HasShippingTracking = dto.HasShippingTracking;
        package.HasShippingLabelPrinting = dto.HasShippingLabelPrinting;
        package.HasFreeShipping = dto.HasFreeShipping;
        package.HasCashOnDelivery = dto.HasCashOnDelivery;
        package.HasShippingDiscounts = dto.HasShippingDiscounts;
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
        var pendingStores = await _context.Stores.CountAsync(s => s.Status == StoreStatus.PendingApproval);
        var totalUsers = await _context.Users.CountAsync();
        var totalProducts = await _context.Products.CountAsync();
        var totalOrders = await _context.Orders.LongCountAsync();
        var totalRevenue = await _context.Orders.SumAsync(o => (decimal?)o.TotalAmount) ?? 0m;
        var totalReferrals = await _context.ReferralCodes.CountAsync();
        var pendingCommissions = await _context.AffiliateCommissions
            .Where(c => c.Status == AffiliateCommissionStatus.Pending)
            .SumAsync(c => (decimal?)c.Amount) ?? 0m;

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
            PendingStores = pendingStores,
            TotalUsers = totalUsers,
            TotalProductsAcrossPlatform = totalProducts,
            TotalOrders = totalOrders,
            TotalRevenue = totalRevenue,
            TotalReferrals = totalReferrals,
            PendingReferralCommissions = pendingCommissions,
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

    public async Task<RevenueDashboardDto> GetRevenueDashboardAsync()
    {
        var now = DateTime.UtcNow;
        var thirtyDaysAgo = now.AddDays(-30);

        var subscriptions = await _context.Subscriptions
            .Include(s => s.Package)
            .ToListAsync();

        var activeSubs = subscriptions.Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.GracePeriod).ToList();
        var totalActive = activeSubs.Count;
        var mrr = activeSubs.Sum(s => s.Package.MonthlyPrice);
        var arr = mrr * 12;

        var cancelledLast30 = subscriptions.Count(s =>
            s.Status == SubscriptionStatus.Cancelled && s.UpdatedAt >= thirtyDaysAgo);

        var churnRate = totalActive > 0
            ? Math.Round((double)cancelledLast30 / totalActive * 100, 2)
            : 0;

        var monthlyChurnRate = churnRate / 100;
        var avgMonthlyRevenuePerStore = totalActive > 0 ? mrr / totalActive : 0;
        var ltv = monthlyChurnRate > 0
            ? Math.Round(avgMonthlyRevenuePerStore / (decimal)monthlyChurnRate, 2)
            : avgMonthlyRevenuePerStore * 12;

        return new RevenueDashboardDto
        {
            Mrr = mrr,
            Arr = arr,
            ChurnRate = churnRate,
            Ltv = ltv
        };
    }

    public async Task<List<PlatformInvoiceDto>> GetPlatformInvoicesAsync(bool? overdueOnly)
    {
        var now = DateTime.UtcNow;

        var query = _context.Subscriptions
            .Include(s => s.Store)
            .Include(s => s.Package)
            .Where(s => s.Status == SubscriptionStatus.Active
                     || s.Status == SubscriptionStatus.GracePeriod
                     || s.Status == SubscriptionStatus.Expired)
            .Select(s => new
            {
                s.Id,
                s.StoreId,
                StoreName = s.Store.StoreName,
                StoreSlug = s.Store.StoreSlug,
                PackageName = s.Package.PackageName,
                Amount = s.Package.MonthlyPrice,
                s.EndDate,
                s.PaymentStatus,
                Overdue = s.PaymentStatus != "Paid" && s.EndDate < now
            });

        if (overdueOnly == true)
            query = query.Where(s => s.Overdue);

        var result = await query.ToListAsync();

        return result.Select(s => new PlatformInvoiceDto
        {
            Id = s.Id,
            StoreId = s.StoreId,
            StoreName = s.StoreName,
            StoreSlug = s.StoreSlug,
            PackageName = s.PackageName,
            Amount = s.Amount,
            DueDate = s.EndDate,
            Status = s.PaymentStatus == "Paid" ? "Paid"
                  : s.Overdue ? "Overdue"
                  : "Pending"
        }).ToList();
    }

    public async Task<byte[]> ExportPlatformInvoicesExcelAsync()
    {
        var invoices = await GetPlatformInvoicesAsync(null);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Platform Invoices");

        ws.Cell(1, 1).Value = "Store Name";
        ws.Cell(1, 2).Value = "Store Slug";
        ws.Cell(1, 3).Value = "Package";
        ws.Cell(1, 4).Value = "Amount";
        ws.Cell(1, 5).Value = "Due Date";
        ws.Cell(1, 6).Value = "Status";

        for (int i = 0; i < invoices.Count; i++)
        {
            var inv = invoices[i];
            int row = i + 2;
            ws.Cell(row, 1).Value = inv.StoreName;
            ws.Cell(row, 2).Value = inv.StoreSlug;
            ws.Cell(row, 3).Value = inv.PackageName;
            ws.Cell(row, 4).Value = (double)inv.Amount;
            ws.Cell(row, 5).Value = inv.DueDate.ToString("yyyy-MM-dd");
            ws.Cell(row, 6).Value = inv.Status;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public async Task<List<AdminThemeDto>> GetThemesAsync()
    {
        return await _context.Themes
            .OrderBy(t => t.DisplayOrder)
            .Select(t => new AdminThemeDto
            {
                Id = t.Id,
                ThemeKey = t.ThemeKey,
                IsEnabled = t.IsEnabled,
                DisplayOrder = t.DisplayOrder,
            })
            .ToListAsync();
    }

    public async Task SetThemeEnabledAsync(long id, bool isEnabled)
    {
        var theme = await _context.Themes.FindAsync(id);
        if (theme == null)
            throw new InvalidOperationException("الثيم غير موجود");
        theme.IsEnabled = isEnabled;
        theme.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}