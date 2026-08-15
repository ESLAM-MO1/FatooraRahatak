using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SubscriptionService : ISubscriptionService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    private static readonly string[] PackageOrder = { "المجانية", "الإنطلاق", "التوسع", "الريادة" };

    private static int GetBillingMonths(BillingCycle cycle) => (int)cycle;

    private static decimal GetBillingDiscount(BillingCycle cycle) => cycle switch
    {
        BillingCycle.Yearly => 0.10m,
        BillingCycle.TwoYears => 0.15m,
        _ => 0m
    };

    private static decimal GetTotalPrice(decimal monthlyPrice, BillingCycle cycle)
    {
        var months = GetBillingMonths(cycle);
        var discount = GetBillingDiscount(cycle);
        return monthlyPrice * months * (1 - discount);
    }

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
            .Where(s => s.StoreId == storeId && s.Status == SubscriptionStatus.Active)
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

        var ownerUser = await _context.Users.FindAsync(store.OwnerUserId);

        var now = DateTime.UtcNow;
        var storeLocked = store.Status == StoreStatus.Suspended || store.Status == StoreStatus.Closed;

        // ⚠️ إصلاح: كانت تظهر رسالة "مطلوب التجديد الآن" أثناء عمل المزايا لمجرد انتهاء
        // الاشتراك أو عدم وجود اشتراك نشط، بينما المتجر ما زال Active والباقة مفعّلة فعليًا.
        // القاعدة الجديدة: مطلوب التجديد فقط إذا كان المتجر موقوفًا فعليًا، أو انتهى
        // الاشتراك فعليًا (بعد مراعاة فترة السماح في الأيام المتبقية).
        var effectiveEnd = activeSubscription?.EndDate
            ?? (activeSubscription?.GracePeriodEnd ?? (DateTime?)null);
        var daysRemaining = activeSubscription == null || effectiveEnd == null
            ? (int?)null
            : Math.Max(0, (int)Math.Ceiling((effectiveEnd.Value - now).TotalDays));

        var requiresRenewal = storeLocked
            || (daysRemaining != null && daysRemaining <= 7 && (activeSubscription!.GracePeriodEnd == null || activeSubscription!.GracePeriodEnd <= now))
            || (activeSubscription == null && storeLocked);

        return new SubscriptionStatusDto
        {
            CurrentPackage = store.Package.PackageName,
            Status = store.Status.ToString(),
            BillingCycleDate = store.BillingCycleDate,
            GracePeriodEnd = activeSubscription?.GracePeriodEnd,
            Balance = ownerUser?.AffiliateBalance ?? 0m,
            CurrentProductsCount = productsCount,
            MaxProducts = store.Package.MaxProducts,
            CurrentEmployeesCount = employeesCount,
            MaxEmployees = store.Package.MaxEmployees,
            CurrentWarehousesCount = warehousesCount,
            MaxWarehouses = store.Package.MaxWarehouses,
            MaxThemes = store.Package.MaxThemes,
            BillingCycle = (activeSubscription?.BillingCycle ?? Domain.Enums.BillingCycle.Monthly).ToString(),
            SubscriptionEndDate = activeSubscription?.EndDate,
            DaysRemaining = daysRemaining,
            RequiresRenewal = requiresRenewal,
            SubscriptionStatus = activeSubscription?.Status.ToString(),
            HasPos = store.Package.HasPos,
            HasPayroll = store.Package.HasPayroll,
            HasAccountingFull = store.Package.HasAccountingFull,
            HasZatcaInvoice = store.Package.HasZatcaInvoice,
            HasCustomDomain = store.Package.HasCustomDomain,
            HasLogo = store.Package.HasLogo,
            HasApiAccess = store.Package.HasApiAccess,
            HasAffiliateMarketing = store.Package.HasAffiliateMarketing,
            HasShippingIntegration = store.Package.HasShippingIntegration,
            HasShippingCalculator = store.Package.HasShippingCalculator,
            HasShippingTracking = store.Package.HasShippingTracking,
            HasShippingLabelPrinting = store.Package.HasShippingLabelPrinting,
            HasFreeShipping = store.Package.HasFreeShipping,
            HasCashOnDelivery = store.Package.HasCashOnDelivery,
            HasShippingDiscounts = store.Package.HasShippingDiscounts
        };
    }

    public async Task<SubscriptionChangeResultDto> UpgradeAsync(long storeId, ChangePackageDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (store.Status == StoreStatus.Suspended)
            throw new InvalidOperationException("حسابك موقوف مؤقتًا بسبب انتهاء الباقة، جدّد اشتراكك أولاً");

        var newPackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == dto.PackageName);
        if (newPackage == null)
            throw new InvalidOperationException("الباقة المطلوبة غير موجودة");

        var currentIndex = Array.IndexOf(PackageOrder, store.Package.PackageName);
        var newIndex = Array.IndexOf(PackageOrder, newPackage.PackageName);

        if (newIndex <= currentIndex)
            throw new InvalidOperationException("هذه ليست عملية ترقية، استخدم التنزيل بدلاً من ذلك");

        // إنشاء اشتراك بانتظار الدفع فقط — لا يتم تغيير باقة المتجر حتى تسديد المبلغ
        var totalPrice = GetTotalPrice(newPackage.MonthlyPrice, dto.BillingCycle);
        var result = await ApplyBalanceAsync(store.OwnerUserId, totalPrice);

        var subscription = new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = newPackage.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(dto.BillingCycle)),
            BillingCycle = dto.BillingCycle,
            Status = SubscriptionStatus.Pending,
            PaymentStatus = result.DueAmount <= 0 ? "Paid" : "Pending",
            DueAmount = result.DueAmount,
            AutoRenew = true
        };
        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        result.SubscriptionId = subscription.Id;
        result.RequiresPayment = result.DueAmount > 0;
        result.CurrentPackage = store.Package.PackageName;
        result.NewPackage = newPackage.PackageName;

        // إذا غطّى الرصيد كامل المبلغ → تفعيل فوري بدون دفع إلكتروني
        if (result.DueAmount <= 0)
        {
            await ActivateSubscriptionOnPaymentAsync(subscription.Id);
            result.PaymentStatus = "Paid";
        }

        return result;
    }

    public async Task<SubscriptionChangeResultDto> DowngradeAsync(long storeId, ChangePackageDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (store.Status == StoreStatus.Suspended)
            throw new InvalidOperationException("حسابك موقوف مؤقتًا بسبب انتهاء الباقة، جدّد اشتراكك أولاً");

        var newPackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == dto.PackageName);
        if (newPackage == null)
            throw new InvalidOperationException("الباقة المطلوبة غير موجودة");

        var currentIndex = Array.IndexOf(PackageOrder, store.Package.PackageName);
        var newIndex = Array.IndexOf(PackageOrder, newPackage.PackageName);

        if (newIndex >= currentIndex)
            throw new InvalidOperationException("هذه ليست عملية تنزيل، استخدم الترقية بدلاً من ذلك");

        // فحوصات الحدود (لا يجوز التنزيل مع تجاوز حدود الباقة الجديدة)
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

        // ⚠️ تكميل فحوصات التنزيل: كل الحدود والمزايا المتبقية

        // الأوامر الشهرية
        if (newPackage.MaxOrdersPerMonth is > 0)
        {
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var ordersThisMonth = await _context.Orders.CountAsync(o => o.StoreId == storeId && o.CreatedAt >= monthStart);
            if (PackageLimitHelper.ExceedsLimit(newPackage.MaxOrdersPerMonth, ordersThisMonth))
                throw new InvalidOperationException(
                    $"لا يمكن التنزيل، لديك {ordersThisMonth} طلب هذا الشهر والباقة الجديدة تسمح بـ {newPackage.MaxOrdersPerMonth} فقط.");
        }

        // شركات الشحن
        var shippingCompaniesCount = await _context.ShippingCompanies.CountAsync(c => c.StoreId == storeId);
        if (PackageLimitHelper.ExceedsLimit(newPackage.MaxShippingCompanies, shippingCompaniesCount))
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {shippingCompaniesCount} شركة شحن والباقة الجديدة تسمح بـ {newPackage.MaxShippingCompanies} فقط. يرجى حذف الشركات الزائدة أولاً.");

        // الفروع/الكاشيرات (عدد الورديات المفتوحة)
        var openBranchesCount = await _context.Set<PosShift>()
            .CountAsync(s => s.StoreId == storeId && s.ClosedAt == null);
        if (PackageLimitHelper.ExceedsLimit(newPackage.MaxBranchesPOS, openBranchesCount))
            throw new InvalidOperationException(
                $"لا يمكن التنزيل، لديك {openBranchesCount} كاشير/فرع مفتوح حاليًا والباقة الجديدة تسمح بـ {newPackage.MaxBranchesPOS} فقط. يرجى إغلاق الفروع الزائدة أولاً.");

        // الدومين المخصص
        if (!newPackage.HasCustomDomain)
        {
            var storeWithDomain = await _context.Stores.AnyAsync(s => s.Id == storeId && !string.IsNullOrWhiteSpace(s.CustomDomain));
            if (storeWithDomain)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك دومين مخصص والباقة الجديدة لا تتضمن ميزة الدومين المخصص.");
        }

        // الدفع عند الاستلام مفعّل
        if (!newPackage.HasCashOnDelivery)
        {
            var codEnabled = await _context.StorePaymentMethods
                .AnyAsync(m => m.StoreId == storeId && m.Type == PaymentMethodType.CashOnDelivery && m.IsEnabled);
            if (codEnabled)
                throw new InvalidOperationException("لا يمكن التنزيل، الدفع عند الاستلام مفعّل والباقة الجديدة لا تدعمه. يرجى إيقافه أولاً.");
        }

        // الشحن مفعّل (شركات/شحنات)
        if (!newPackage.HasShippingIntegration)
        {
            var hasShipping = await _context.ShippingCompanies.AnyAsync(c => c.StoreId == storeId);
            if (hasShipping)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك شركات شحن والباقة الجديدة لا تتضمن تكامل الشحن.");
        }

        // سجلات رواتب
        if (!newPackage.HasPayroll)
        {
            var hasPayroll = await _context.Payrolls.AnyAsync(p => p.Employee.StoreId == storeId);
            if (hasPayroll)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك سجلات رواتب والباقة الجديدة لا تتضمن ميزة الرواتب.");
        }

        // فواتير/محاسبة
        if (!newPackage.HasAccountingFull)
        {
            var hasInvoices = await _context.Invoices.AnyAsync(i => i.StoreId == storeId);
            if (hasInvoices)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك فواتير محاسبية والباقة الجديدة لا تتضمن المحاسبة الكاملة.");
        }

        // تسجيل ضريبي (زاتكا)
        if (!newPackage.HasZatcaInvoice)
        {
            var isVat = await _context.Stores.AnyAsync(s => s.Id == storeId && s.IsVatRegistered);
            if (isVat)
                throw new InvalidOperationException("لا يمكن التنزيل، متجرك مسجل ضريبيًا (زاتكا) والباقة الجديدة لا تتضمن ميزة الفواتير الضريبية.");
        }

        // نظام العمولة (Affiliate)
        if (!newPackage.HasAffiliateMarketing)
        {
            var hasReferral = await _context.Referrals.AnyAsync(r => r.ReferredUserId == store.OwnerUserId);
            if (hasReferral)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك عمولات تسويق بالعمولة والباقة الجديدة لا تتضمن الميزة.");
        }

        // ورديات POS
        if (!newPackage.HasPos)
        {
            var hasPosShifts = await _context.PosShifts.AnyAsync(s => s.StoreId == storeId);
            if (hasPosShifts)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك ورديات نقاط بيع والباقة الجديدة لا تتضمن ميزة الـ POS.");
        }

        // مفاتيح API
        if (!newPackage.HasApiAccess)
        {
            var hasApiKeys = await _context.StoreApiKeys.AnyAsync(k => k.StoreId == storeId && !k.IsRevoked);
            if (hasApiKeys)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك مفاتيح API والباقة الجديدة لا تتضمن الوصول للـ API. يرجى سحب المفاتيح أولًا.");
        }

        // شعار المتجر
        if (!newPackage.HasLogo)
        {
            var hasLogo = await _context.Stores.AnyAsync(s => s.Id == storeId && !string.IsNullOrWhiteSpace(s.Logo));
            if (hasLogo)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك شعار متجر والباقة الجديدة لا تتضمن ميزة رفع الشعار. يرجى إزالة الشعار أولًا.");
        }

        // خصومات الشحن
        if (!newPackage.HasShippingDiscounts)
        {
            var hasShippingDiscounts = await _context.Stores.AnyAsync(s => s.Id == storeId
                && (s.FreeShippingThreshold.HasValue || s.ShippingDiscountPercent.HasValue));
            if (hasShippingDiscounts)
                throw new InvalidOperationException("لا يمكن التنزيل، لديك خصومات شحن مضبوطة والباقة الجديدة لا تتضمن الميزة. يرجى إيقافها أولًا.");
        }

        // اشتراك بانتظار الدفع — لن يُطبّق التنزيل إلا بعد السداد
        var totalPrice = GetTotalPrice(newPackage.MonthlyPrice, dto.BillingCycle);
        var result = await ApplyBalanceAsync(store.OwnerUserId, totalPrice);

        var subscription = new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = newPackage.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(dto.BillingCycle)),
            BillingCycle = dto.BillingCycle,
            Status = SubscriptionStatus.Pending,
            PaymentStatus = result.DueAmount <= 0 ? "Paid" : "Pending",
            DueAmount = result.DueAmount,
            AutoRenew = true
        };
        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        result.SubscriptionId = subscription.Id;
        result.RequiresPayment = result.DueAmount > 0;
        result.CurrentPackage = store.Package.PackageName;
        result.NewPackage = newPackage.PackageName;

        if (result.DueAmount <= 0)
        {
            await ActivateSubscriptionOnPaymentAsync(subscription.Id);
            result.PaymentStatus = "Paid";
        }

        return result;
    }

    public async Task<SubscriptionChangeResultDto> RenewAsync(long storeId, BillingCycle billingCycle = BillingCycle.Monthly)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (store.Status == StoreStatus.Closed)
            throw new InvalidOperationException("حسابك مغلق نهائيًا، تواصل مع الدعم");

        // تجديد الاشتراك الحالي: اشتراك جديد بانتظار الدفع (عندما يكون هناك مبلغ مستحق)
        var totalPrice = GetTotalPrice(store.Package.MonthlyPrice, billingCycle);
        var result = await ApplyBalanceAsync(store.OwnerUserId, totalPrice);

        var subscription = new Domain.Entities.Packages.Subscription
        {
            StoreId = storeId,
            PackageId = store.Package.Id,
            StartDate = DateTime.UtcNow,
            EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(billingCycle)),
            BillingCycle = billingCycle,
            Status = SubscriptionStatus.Pending,
            PaymentStatus = result.DueAmount <= 0 ? "Paid" : "Pending",
            DueAmount = result.DueAmount,
            AutoRenew = true
        };
        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        result.SubscriptionId = subscription.Id;
        result.RequiresPayment = result.DueAmount > 0;
        result.CurrentPackage = store.Package.PackageName;
        result.NewPackage = store.Package.PackageName;

        if (result.DueAmount <= 0)
        {
            await ActivateSubscriptionOnPaymentAsync(subscription.Id);
            result.PaymentStatus = "Paid";
        }

        return result;
    }

    public async Task CancelAsync(long storeId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var latestSubscription = await _context.Subscriptions
            .Where(s => s.StoreId == storeId && s.Status == SubscriptionStatus.Active)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (latestSubscription == null)
            throw new InvalidOperationException("لا يوجد اشتراك نشط لإلغائه");

        latestSubscription.AutoRenew = false;
        latestSubscription.UpdatedAt = DateTime.UtcNow;

        // عند إلغاء التجديد التلقائي: عند انتهاء الاشتراك الحالي يتم منح فترة سماح 7 أيام
        // (القفل الأوتوماتيكي يُدار في SubscriptionExpiryBackgroundService)
        if (latestSubscription.GracePeriodEnd == null)
            latestSubscription.GracePeriodEnd = latestSubscription.EndDate.AddDays(7);

        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// يُستدعى بعد نجاح الدفع (Webhook) أو عند تغطية الرصيد كامل المبلغ:
    /// يفعّل الاشتراك المعلّق ويطبّق باقة المتجر الجديدة فعليًا.
    /// </summary>
    public async Task ActivateSubscriptionOnPaymentAsync(long subscriptionId)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);
        if (subscription == null)
            return;

        if (subscription.Status == SubscriptionStatus.Active)
            return;

        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == subscription.StoreId);
        if (store == null)
            return;

        // إلغاء أي اشتراكات نشطة سابقة ليحل محلها هذا الاشتراك
        var otherActive = await _context.Subscriptions
            .Where(s => s.StoreId == subscription.StoreId && s.Status == SubscriptionStatus.Active && s.Id != subscription.Id)
            .ToListAsync();
        foreach (var other in otherActive)
        {
            other.Status = SubscriptionStatus.Cancelled;
            other.AutoRenew = false;
            other.UpdatedAt = DateTime.UtcNow;
        }

        subscription.Status = SubscriptionStatus.Active;
        subscription.StartDate = DateTime.UtcNow;
        subscription.EndDate = DateTime.UtcNow.AddMonths(GetBillingMonths(subscription.BillingCycle));
        subscription.GracePeriodEnd = null;
        subscription.PaymentStatus = "Paid";
        subscription.AutoRenew = true;
        subscription.UpdatedAt = DateTime.UtcNow;

        store.PackageId = subscription.PackageId;
        store.Status = StoreStatus.Active;
        store.BillingCycleDate = DateTime.UtcNow;
        store.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        try
        {
            await _notificationService.CreateAsync(
                store.OwnerUserId,
                "تم تفعيل الباقة",
                $"تم تفعيل باقتك \"{subscription.Package?.PackageName ?? ""}\" بنجاح. اشتراكك الجديد ساري حتى {subscription.EndDate:yyyy-MM-dd}",
                NotificationType.PackageActivated,
                "/dashboard/subscription");
        }
        catch { }
    }

    private async Task<SubscriptionChangeResultDto> ApplyBalanceAsync(long ownerUserId, decimal packagePrice)
    {
        var user = await _context.Users.FindAsync(ownerUserId);
        var result = new SubscriptionChangeResultDto();

        if (user == null || packagePrice <= 0 || user.AffiliateBalance <= 0)
        {
            result.DueAmount = packagePrice;
            result.BalanceUsed = 0;
            result.PaymentStatus = "Pending";
            return result;
        }

        result.BalanceUsed = Math.Min(user.AffiliateBalance, packagePrice);
        user.AffiliateBalance -= result.BalanceUsed;
        user.UpdatedAt = DateTime.UtcNow;

        result.DueAmount = packagePrice - result.BalanceUsed;
        result.PaymentStatus = result.DueAmount <= 0 ? "Paid" : "Pending";
        return result;
    }
}
