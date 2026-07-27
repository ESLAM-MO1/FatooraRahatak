using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    private static readonly string[] PackageOrder = { "المجانية", "الإنطلاق", "التوسع", "الريادة" };

    public SubscriptionService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<SubscriptionStatusDto> GetStatusAsync(long storeId)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var productsCount = await _context.Products.CountAsync(p => p.StoreId == storeId);
        var employeesCount = await _context.Employees.CountAsync(e => e.StoreId == storeId);
        var warehousesCount = await _context.Warehouses.CountAsync(w => w.StoreId == storeId);

        var activeSubscription = await _context.Subscriptions
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (activeSubscription != null && activeSubscription.EndDate < DateTime.UtcNow.AddDays(7) && activeSubscription.EndDate > DateTime.UtcNow)
        {
            try
            {
                var existingWarning = await _context.Notifications
                    .AnyAsync(n => n.UserId == store.OwnerUserId && n.Type == NotificationType.SubscriptionExpiring && n.CreatedAt > DateTime.UtcNow.AddDays(-1));

                if (!existingWarning)
                {
                    await _notificationService.CreateAsync(
                        store.OwnerUserId,
                        "الباقة على وشك الانتهاء",
                        $"باقتك الحالية تنتهي في {activeSubscription.EndDate:yyyy-MM-dd}، جدّدها لاستمرار الخدمة",
                        NotificationType.SubscriptionExpiring,
                        "/dashboard/subscription");
                }
            }
            catch { }
        }

        return new SubscriptionStatusDto
        {
            CurrentPackage = store.Package.PackageName,
            Status = store.Status.ToString(),
            BillingCycleDate = store.BillingCycleDate,
            GracePeriodEnd = activeSubscription?.GracePeriodEnd,
            CurrentProductsCount = productsCount,
            MaxProducts = store.Package.MaxProducts,
            CurrentEmployeesCount = employeesCount,
            MaxEmployees = store.Package.MaxEmployees,
            CurrentWarehousesCount = warehousesCount,
            MaxWarehouses = store.Package.MaxWarehouses
        };
    }

    public async Task UpgradeAsync(long storeId, ChangePackageDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var newPackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == dto.PackageName);
        if (newPackage == null)
            throw new InvalidOperationException("الباقة المطلوبة غير موجودة");

        var currentIndex = Array.IndexOf(PackageOrder, store.Package.PackageName);
        var newIndex = Array.IndexOf(PackageOrder, newPackage.PackageName);

        if (newIndex <= currentIndex)
            throw new InvalidOperationException("هذه ليست عملية ترقية، استخدم التنزيل بدلاً من ذلك");

        store.PackageId = newPackage.Id;
        store.Status = StoreStatus.Active;

        _context.Subscriptions.Add(new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = newPackage.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(1),
            Status = SubscriptionStatus.Active,
            PaymentStatus = "Pending", 
            AutoRenew = true
        });

        await _context.SaveChangesAsync();
    }

    public async Task DowngradeAsync(long storeId, ChangePackageDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var newPackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == dto.PackageName);
        if (newPackage == null)
            throw new InvalidOperationException("الباقة المطلوبة غير موجودة");

        var currentIndex = Array.IndexOf(PackageOrder, store.Package.PackageName);
        var newIndex = Array.IndexOf(PackageOrder, newPackage.PackageName);

        if (newIndex >= currentIndex)
            throw new InvalidOperationException("هذه ليست عملية تنزيل، استخدم الترقية بدلاً من ذلك");

        var productsCount = await _context.Products.CountAsync(p => p.StoreId == storeId);
        if (PackageLimitHelper.ExceedsLimit(newPackage.MaxProducts, productsCount))
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {productsCount} منتج والباقة الجديدة تسمح بـ {newPackage.MaxProducts} فقط. يرجى حذف المنتجات الزائدة أولاً.");

        var employeesCount = await _context.Employees.CountAsync(e => e.StoreId == storeId && e.Status == "Active");
        if (PackageLimitHelper.ExceedsLimit(newPackage.MaxEmployees, employeesCount))
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {employeesCount} موظف والباقة الجديدة تسمح بـ {newPackage.MaxEmployees} فقط. يرجى إنهاء خدمة الموظفين الزائدين أولاً.");

        var warehousesCount = await _context.Warehouses.CountAsync(w => w.StoreId == storeId);
        if (PackageLimitHelper.ExceedsLimit(newPackage.MaxWarehouses, warehousesCount))
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {warehousesCount} مخزن والباقة الجديدة تسمح بـ {newPackage.MaxWarehouses} فقط. يرجى حذف المخازن الزائدة أولاً.");

        store.PackageId = newPackage.Id;

        _context.Subscriptions.Add(new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = newPackage.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(1),
            Status = SubscriptionStatus.Active,
            PaymentStatus = "Pending",
            AutoRenew = true
        });

        await _context.SaveChangesAsync();
    }

    public async Task RenewAsync(long storeId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        store.Status = StoreStatus.Active;
        store.BillingCycleDate = DateTime.UtcNow;

        var latestSubscription = await _context.Subscriptions
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestSubscription != null)
        {
            latestSubscription.Status = SubscriptionStatus.Active;
            latestSubscription.EndDate = DateTime.UtcNow.AddMonths(1);
            latestSubscription.GracePeriodEnd = null;
            latestSubscription.PaymentStatus = "Paid";
        }

        await _context.SaveChangesAsync();
    }

    public async Task CancelAsync(long storeId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var latestSubscription = await _context.Subscriptions
            .Where(s => s.StoreId == storeId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestSubscription != null)
        {
            latestSubscription.Status = SubscriptionStatus.Cancelled;
            latestSubscription.AutoRenew = false;
        }

        store.Status = StoreStatus.Active; 
        if (latestSubscription != null)
            latestSubscription.GracePeriodEnd = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();
    }
}