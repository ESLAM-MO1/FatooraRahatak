using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// معالجة انتهاء اشتراكات "صناعة تطبيقات الجوال":
/// بعد سنة من تسليم النسخة (PublishedAt) بلا تجديد ⇒ يُعلَّم الاشتراك كمنتهٍ
/// (Status=Expired) ويتوقف التطبيق المولَّد عن الباك إند تلقائيًا (عبر بوابة
/// IsAppAccessAllowedAsync)، ويُرسل إشعار للتاجر لتجديد الاشتراك (300 ر.س سنويًا).
/// </summary>
public class MobileAppExpiryBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MobileAppExpiryBackgroundService> _logger;

    public MobileAppExpiryBackgroundService(IServiceScopeFactory scopeFactory, ILogger<MobileAppExpiryBackgroundService> logger)
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
                _logger.LogError(ex, "فشلت دورة فحص انتهاء اشتراكات تطبيقات الجوال");
            }

            await Task.Delay(TimeSpan.FromHours(6), stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        var changed = false;

        // نجلب الاشتراكات النشطة التي سُلِّمت نسختها، ونحسب الانتهاء من تاريخ
        // التسليم + 12 شهرًا (مرجع موحّد)، بدلًا من الاعتماد على EndDate المخزَّن.
        var active = await db.StoreAppSubscriptions
            .Include(s => s.Store)
            .Where(s => s.Status == SubscriptionStatus.Active && s.PublishedAt != null)
            .ToListAsync(ct);

        foreach (var sub in active)
        {
            var realEnd = sub.PublishedAt!.Value.AddMonths(12);

            // انتهت السنة بلا تجديد ⇒ منتهٍ + إشعار (مرة واحدة عبر تغيير الحالة).
            if (realEnd < now)
            {
                sub.Status = SubscriptionStatus.Expired;
                sub.EndDate = realEnd;
                sub.UpdatedAt = now;
                changed = true;
                try
                {
                    if (sub.Store != null)
                    {
                        await notifications.CreateAsync(
                            sub.Store.OwnerUserId,
                            "انتهى اشتراك تطبيق الجوال",
                            "انتهى اشتراك تطبيق الجوال ولم يتم تجديده، فتوقف التطبيق عن العمل مؤقتًا. جدّد الاشتراك (300 ر.س سنويًا) لإعادة تشغيله.",
                            NotificationType.SubscriptionExpired,
                            "/dashboard/store-settings?tab=mobileApp");
                    }
                }
                catch { }
                continue;
            }

            // حافظ على تزامن EndDate مع المرجع الموحّد.
            sub.EndDate = realEnd;

            // تنبيه قبل الانتهاء بـ 14 يومًا — مرة واحدة فقط لكل اشتراك،
            // نرصده عبر وسم في AdminNote لتفادي التكرار كل دورة فحص.
            if (realEnd < now.AddDays(14)
                && (sub.AdminNote == null || !sub.AdminNote.Contains("[renewal-reminded]")))
            {
                sub.AdminNote = string.IsNullOrWhiteSpace(sub.AdminNote)
                    ? "[renewal-reminded]"
                    : sub.AdminNote + " [renewal-reminded]";
                sub.UpdatedAt = now;
                changed = true;
                try
                {
                    if (sub.Store != null)
                    {
                        await notifications.CreateAsync(
                            sub.Store.OwnerUserId,
                            "اشتراك تطبيق الجوال على وشك الانتهاء",
                            $"ينتهي اشتراك تطبيق الجوال في {realEnd:yyyy-MM-dd}. جدّده (300 ر.س سنويًا) لتفادي توقف التطبيق.",
                            NotificationType.SubscriptionExpiring,
                            "/dashboard/store-settings?tab=mobileApp");
                    }
                }
                catch { }
            }
        }

        if (changed)
            await db.SaveChangesAsync(ct);
    }
}
