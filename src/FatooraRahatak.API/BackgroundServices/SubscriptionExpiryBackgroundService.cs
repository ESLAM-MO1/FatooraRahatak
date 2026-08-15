using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// معالجة أوتوماتيكية للاشتراكات المنتهية (مثل أي موقع SaaS):
/// 1) اشتراك نشط انتهت مدته → فترة سماح 7 أيام + إشعار "الباقة على وشك/انتهت"
/// 2) انتهت فترة السماح بلا دفع → نزول المتجر تلقائيًا للباقة المجانية + إشعار واضح
///    "انتهت باقتك" (لا يبقى المتجر معلّقًا على باقة مدفوعة منتهية ولا يُوقف تمامًا —
///    بل يتحول لمزايا الباقة المجانية المتاحة لكل المستخدمين)
/// 3) اشتراكات معلّقة (بانتظار الدفع) أقدم من 7 أيام → إلغاء
/// </summary>
public class SubscriptionExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionExpiryBackgroundService> _logger;

    public SubscriptionExpiryBackgroundService(IServiceScopeFactory scopeFactory, ILogger<SubscriptionExpiryBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة فحص انتهاء الاشتراكات");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var changed = false;

        // 1) اشتراكات نشطة انتهت مدتها → فترة سماح 7 أيام
        var expiredActive = await db.Subscriptions
            .Include(s => s.Store)
            .Where(s => s.Status == SubscriptionStatus.Active && s.EndDate < now)
            .ToListAsync(ct);

        foreach (var sub in expiredActive)
        {
            sub.Status = SubscriptionStatus.GracePeriod;
            sub.GracePeriodEnd = now.AddDays(7);
            sub.UpdatedAt = now;
            changed = true;

            try
            {
                await notifications.CreateAsync(
                    sub.Store.OwnerUserId,
                    "انتهت باقتك — فترة سماح",
                    $"انتهت باقتك في {sub.EndDate:yyyy-MM-dd}. لديك 7 أيام سماح لتجديد اشتراكك قبل إيقاف متجرك مؤقتًا.",
                    NotificationType.SubscriptionExpiring,
                    "/dashboard/subscription");
            }
            catch { }
        }

        // 2) انتهت فترة السماح بلا دفع → نزول تلقائي للباقة المجانية + إشعار واضح
        var expiredGrace = await db.Subscriptions
            .Include(s => s.Store)
            .Where(s => s.Status == SubscriptionStatus.GracePeriod && s.GracePeriodEnd < now)
            .ToListAsync(ct);

        foreach (var sub in expiredGrace)
        {
            sub.Status = SubscriptionStatus.Expired;
            sub.UpdatedAt = now;
            changed = true;

            if (sub.Store != null)
            {
                var freePackage = await db.Packages.FirstOrDefaultAsync(p => string.Equals(p.PackageName, "المجانية", StringComparison.Ordinal))
                    ?? await db.Packages.OrderBy(p => p.MonthlyPrice).FirstOrDefaultAsync(ct);

                // نزول المتجر للباقة المجانية: يبقى المتجر يعمل بمزايا المجانية
                // ولا يبقى "معلّقًا" على باقة مدفوعة انتهت مدتها بالفعل.
                if (freePackage != null)
                {
                    sub.Store.PackageId = freePackage.Id;
                    sub.Store.Status = StoreStatus.Active;
                    sub.Store.UpdatedAt = now;
                }

                try
                {
                    await notifications.CreateAsync(
                        sub.Store.OwnerUserId,
                        "انتهت باقتك — تم التحويل للباقة المجانية",
                        $"انتهت باقتك ({sub.Package?.PackageName ?? ""}) ولم يتم تجديدها. أصبحت الآن على الباقة المجانية بمزاياها الأساسية. يمكنك الترقية في أي وقت من صفحة الباقات.",
                        NotificationType.SubscriptionExpired,
                        "/dashboard/subscription");
                }
                catch { }
            }
        }

        // 3) اشتراكات معلّقة (بانتظار الدفع) أقدم من 7 أيام → إلغاء
        var stalePending = await db.Subscriptions
            .Where(s => s.Status == SubscriptionStatus.Pending && s.CreatedAt < now.AddDays(-7))
            .ToListAsync(ct);

        foreach (var sub in stalePending)
        {
            sub.Status = SubscriptionStatus.Cancelled;
            sub.AutoRenew = false;
            sub.UpdatedAt = now;
            changed = true;
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }
}
