using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// قفل أوتوماتيكي للاشتراكات المنتهية:
/// 1) اشتراك نشط انتهت مدته → فترة سماح 7 أيام + إشعار
/// 2) انتهت فترة السماح بلا تجديد → إيقاف المتجر مؤقتًا (Suspended) + إشعار
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

        // 2) انتهت فترة السماح بلا تجديد → إيقاف المتجر مؤقتًا
        var expiredGrace = await db.Subscriptions
            .Include(s => s.Store)
            .Where(s => s.Status == SubscriptionStatus.GracePeriod && s.GracePeriodEnd < now)
            .ToListAsync(ct);

        foreach (var sub in expiredGrace)
        {
            sub.Status = SubscriptionStatus.Suspended;
            sub.UpdatedAt = now;
            changed = true;

            if (sub.Store != null)
            {
                sub.Store.Status = StoreStatus.Suspended;
                sub.Store.IsOnline = false;
                sub.Store.UpdatedAt = now;

                try
                {
                    await notifications.CreateAsync(
                        sub.Store.OwnerUserId,
                        "تم إيقاف متجرك مؤقتًا",
                        "لم يتم تجديد باقتك، تم إيقاف متجرك مؤقتًا ولن يتمكن العملاء من الطلب. جدّد اشتراكك لإعادة تفعيله فورًا.",
                        NotificationType.SubscriptionSuspended,
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
