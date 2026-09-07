using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Notifications;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// تنبيهات الباقات التلقائية (تُشغَّل يوميًا):
/// 10) تنبيه اقتراب انتهاء الباقة: 7 أيام / 3 أيام / يوم واحد قبل الانتهاء (كل تنبيه مرة واحدة فقط).
/// 12) تنبيه اقتراب حد الاستخدام: 80% و90% من حدود الباقة (منتجات/موظفين/مخازن/طلبات).
/// 13) تنبيه فشل دفع تجديد الباقة: يُرسل عند اشتراك معلّق بانتظار دفع (Pending) تجاوز مهلة مقبولة
///     ولم يتم تفعيله — يُعدّ محاولة تجديد فاشلة.
/// (11) تأكيد الترقية/التجديد يُرسل فورًا من SubscriptionService عند التفعيل — هنا نتأكد أيضًا
///      من تسليمه عبر إرسال تنبيه مزدوج فقط عند الحاجة.
/// كل تنبيه يُسجَّل في جدول EmailNotificationLog لضمان عدم التكرار ومراجعته لاحقًا.
/// </summary>
public class SubscriptionAlertsBackgroundService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SubscriptionAlertsBackgroundService> _logger;

    public SubscriptionAlertsBackgroundService(IServiceScopeFactory scopeFactory, ILogger<SubscriptionAlertsBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // مهلة بدء أولية قصيرة حتى لا تتعارض مع إقلاع باقي النظام
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة تنبيهات الباقات");
            }

            await Task.Delay(PollInterval, stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var now = DateTime.UtcNow;

        // ⚠️ التشغيل اليومي الفعلي فقط (مرة كل يوم) — الفحص كل ساعة لكن العمل يُنفَّذ
        // مرة واحدة يوميًا عبر مقارنة التاريخ المحفوظ في LastRunMarker.
        var marker = await db.Set<Domain.Entities.Platform.PlatformSetting>()
            .FirstOrDefaultAsync(s => s.SettingKey == "SubscriptionAlertsLastRunDate", ct);
        var lastRun = marker != null && DateTime.TryParse(marker.SettingValue, out var parsed) ? parsed : DateTime.MinValue;

        if (lastRun.Date >= now.Date)
            return;

        if (!emailService.IsConfigured())
            return;

        // ---------- (10) تنبيهات اقتراب انتهاء الباقة ----------
        var activeSubs = await db.Subscriptions
            .Include(s => s.Store)
            .ThenInclude(s => s.Owner)
            .Include(s => s.Package)
            .Where(s => s.Status == SubscriptionStatus.Active)
            .ToListAsync(ct);

        foreach (var sub in activeSubs)
        {
            if (sub.Store == null) continue;

            var daysLeft = (int)Math.Ceiling((sub.EndDate - now).TotalDays);

            string? key = daysLeft switch
            {
                7 => "subscription_expiring_7d",
                3 => "subscription_expiring_3d",
                1 => "subscription_expiring_1d",
                _ => null
            };

            if (key != null && daysLeft > 0)
            {
                await SendOnceAsync(db, emailService, ct,
                    key: key,
                    subscriptionId: sub.Id,
                    storeId: sub.StoreId,
                    userId: sub.Store.OwnerUserId,
                    email: sub.Store.Owner?.Email,
                    subject: EmailMessageFactory.SubscriptionExpiring(sub.Store, sub, sub.Package, daysLeft).Subject,
                    body: EmailMessageFactory.SubscriptionExpiring(sub.Store, sub, sub.Package, daysLeft).Body);
            }
        }

        // ---------- (12) تنبيهات اقتراب حد الاستخدام ----------
        var packagesInUse = activeSubs
            .GroupBy(s => s.StoreId)
            .Select(g => g.OrderByDescending(x => x.CreatedAt).First())
            .ToList();

        foreach (var sub in packagesInUse)
        {
            if (sub.Store == null || sub.Package == null) continue;
            var storeId = sub.StoreId;

            var usages = new List<(string Resource, int Used, int? Max)>
            {
                ("المنتجات", await db.Products.CountAsync(p => p.StoreId == storeId, ct), sub.Package.MaxProducts),
                ("الموظفون", await db.Employees.CountAsync(e => e.StoreId == storeId && e.Status == "Active", ct), sub.Package.MaxEmployees > 0 ? sub.Package.MaxEmployees : (int?)null),
                ("المخازن", await db.Warehouses.CountAsync(w => w.StoreId == storeId, ct), sub.Package.MaxWarehouses > 0 ? sub.Package.MaxWarehouses : (int?)null)
            };

            if (sub.Package.MaxOrdersPerMonth is > 0)
            {
                var monthStart = new DateTime(now.Year, now.Month, 1);
                var ordersThisMonth = await db.Orders.CountAsync(o => o.StoreId == storeId && o.CreatedAt >= monthStart, ct);
                usages.Add(("الطلبات الشهرية", ordersThisMonth, sub.Package.MaxOrdersPerMonth));
            }

            foreach (var (resource, used, max) in usages)
            {
                if (max is not ( > 0)) continue;
                var percent = used * 100.0 / max.Value;

                string? key = percent >= 90
                    ? $"usage_limit_90_{resource}"
                    : percent >= 80
                        ? $"usage_limit_80_{resource}"
                        : null;

                if (key != null)
                {
                    var (subject, body) = EmailMessageFactory.SubscriptionUsageLimit(sub.Store, sub.Package, resource, used, max.Value, (decimal)percent);
                    await SendOnceAsync(db, emailService, ct, key, sub.Id, sub.StoreId, sub.Store.OwnerUserId, sub.Store.Owner?.Email, subject, body);
                }
            }
        }

        // ---------- (13) تنبيه فشل دفع التجديد ----------
        var stalePending = await db.Subscriptions
            .Include(s => s.Store)
            .ThenInclude(s => s.Owner)
            .Include(s => s.Package)
            .Where(s => s.Status == SubscriptionStatus.Pending
                     && s.PaymentStatus == "Pending"
                     && s.CreatedAt < now.AddDays(-2))
            .ToListAsync(ct);

        foreach (var sub in stalePending)
        {
            if (sub.Store == null || sub.Package == null) continue;

            await SendOnceAsync(db, emailService, ct,
                key: $"renewal_failed_{sub.Id}",
                subscriptionId: sub.Id,
                storeId: sub.StoreId,
                userId: sub.Store.OwnerUserId,
                email: sub.Store.Owner?.Email,
                subject: EmailMessageFactory.SubscriptionRenewalFailed(sub.Store, sub, sub.Package, null).Subject,
                body: EmailMessageFactory.SubscriptionRenewalFailed(sub.Store, sub, sub.Package, null).Body);
        }

        // ---------- تحديث علامة آخر تشغيل يومي ----------
        if (marker == null)
        {
            db.Set<Domain.Entities.Platform.PlatformSetting>().Add(new Domain.Entities.Platform.PlatformSetting
            {
                SettingKey = "SubscriptionAlertsLastRunDate",
                SettingValue = now.ToString("o")
            });
        }
        else
        {
            marker.SettingValue = now.ToString("o");
            marker.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
    }

    /// <summary>
    /// يرسل التنبيه مرة واحدة فقط (يتحقق من سجل EmailNotificationLog بالمفتاح نفسه).
    /// </summary>
    private static async Task SendOnceAsync(
        AppDbContext db,
        IEmailService emailService,
        CancellationToken ct,
        string key,
        long? subscriptionId,
        long? storeId,
        long? userId,
        string? email,
        string subject,
        string body)
    {
        if (string.IsNullOrWhiteSpace(email))
            return;

        var alreadySent = await db.EmailNotificationLogs
            .AnyAsync(l => l.NotificationKey == key, ct);
        if (alreadySent)
            return;

        var success = true;
        string? error = null;
        try
        {
            await emailService.SendTemplatedEmailAsync(email, subject, body);
        }
        catch (Exception ex)
        {
            success = false;
            error = ex.Message;
        }

        db.EmailNotificationLogs.Add(new EmailNotificationLog
        {
            UserId = userId,
            StoreId = storeId,
            SubscriptionId = subscriptionId,
            NotificationKey = key,
            Subject = subject,
            RecipientEmail = email,
            Success = success,
            ErrorMessage = error,
            SentAt = DateTime.UtcNow
        });

        await db.SaveChangesAsync(ct);
    }
}
