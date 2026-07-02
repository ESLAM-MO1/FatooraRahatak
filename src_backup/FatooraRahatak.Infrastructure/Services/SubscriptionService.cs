using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _context;

    // ترتيب الباقات من الأصغر للأكبر - يستخدم لتحديد Upgrade أو Downgrade
    private static readonly string[] PackageOrder = { "المجانية", "الإنطلاق", "التوسع", "الريادة" };

    public SubscriptionService(AppDbContext context)
    {
        _context = context;
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

        // الترقية فورية بدون شروط
        store.PackageId = newPackage.Id;
        store.Status = StoreStatus.Active;

        _context.Subscriptions.Add(new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = newPackage.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(1),
            Status = SubscriptionStatus.Active,
            PaymentStatus = "Pending", // هيتحدث فعليًا في معلم 4 مع بوابات الدفع
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

        // ==== التحقق من الحدود قبل السماح بالتنزيل (القاعدة المتفق عليها) ====
        var productsCount = await _context.Products.CountAsync(p => p.StoreId == storeId);
        if (newPackage.MaxProducts.HasValue && productsCount > newPackage.MaxProducts.Value)
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {productsCount} منتج والباقة الجديدة تسمح بـ {newPackage.MaxProducts.Value} فقط. يرجى حذف المنتجات الزائدة أولاً.");

        var employeesCount = await _context.Employees.CountAsync(e => e.StoreId == storeId && e.Status == "Active");
        if (employeesCount > newPackage.MaxEmployees)
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {employeesCount} موظف والباقة الجديدة تسمح بـ {newPackage.MaxEmployees} فقط. يرجى إنهاء خدمة الموظفين الزائدين أولاً.");

        var warehousesCount = await _context.Warehouses.CountAsync(w => w.StoreId == storeId);
        if (warehousesCount > newPackage.MaxWarehouses)
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

        // فترة سماح 7 أيام قبل التعليق الفعلي (القاعدة المتفق عليها)
        store.Status = StoreStatus.Active; // يفضل شغال لحد نهاية الفترة الحالية
        if (latestSubscription != null)
            latestSubscription.GracePeriodEnd = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync();
    }
}