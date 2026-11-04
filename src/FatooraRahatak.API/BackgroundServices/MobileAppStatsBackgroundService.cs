using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// مُجمّع إحصاءات تطبيقات الجوال + مُرسِل الإشعارات المجدولة (خلفيًا):
///
/// 1) الإحصاءات: يبني/يحدّث صفوف StoreAppStat اليومية لكل متجر له اشتراك تطبيق فعّال،
///    اعتمادًا على بيانات متجر التاجر الحقيقية:
///      - Orders / Revenue / NewCustomers: من جدول Orders (استثناء الطلبات الملغاة).
///      - Installs: من عدّاد الاشتراك DownloadCount (يُقارَن باليوم السابق لحساب الصافي).
///      - Sessions: تقدير مبني على عدد الطلبات (جلسة لكل طلب على الأقل) إن لم تتوفّر بيانات دقيقة.
///    يكتب صف اليوم (UPSERT) مرة كل يوم، ليظهر الرسم البياني في لوحة التاجر بأرقام حقيقية.
///
/// 2) الإشعارات المجدولة: يقلب حالة كل إشعار مجدول حلّ موعده (ScheduledAt ≤ الآن)
///    إلى Sent ويسجّل SentAt، ويحدّث عدّاد المستلمين تقديريًا (عدد عملاء المتجر).
/// </summary>
public class MobileAppStatsBackgroundService : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromHours(1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MobileAppStatsBackgroundService> _logger;

    public MobileAppStatsBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<MobileAppStatsBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try { await Task.Delay(TimeSpan.FromSeconds(90), stoppingToken); }
        catch (TaskCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة إحصاءات تطبيقات الجوال");
            }

            try { await Task.Delay(PollInterval, stoppingToken); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        await AggregateStatsAsync(db, ct);
        await DispatchScheduledNotificationsAsync(db, ct);
    }

    // ── الإحصاءات اليومية ──
    private async Task AggregateStatsAsync(AppDbContext db, CancellationToken ct)
    {
        var today = DateTime.UtcNow.Date;

        // كل المتاجر التي لها اشتراك تطبيق فعّال.
        var activeStoreIds = await db.StoreAppSubscriptions
            .AsNoTracking()
            .Where(s => s.Status == SubscriptionStatus.Active)
            .Select(s => s.StoreId)
            .Distinct()
            .ToListAsync(ct);

        if (activeStoreIds.Count == 0) return;

        // الطلبات غير الملغاة/المرتدة في نافذة آخر 40 يومًا (نُجمّعها حسب المتجر واليوم).
        var windowStart = today.AddDays(-40);
        var orders = await db.Orders
            .AsNoTracking()
            .Where(o => activeStoreIds.Contains(o.StoreId)
                        && o.CreatedAt >= windowStart
                        && o.Status != OrderStatus.Cancelled
                        && o.Status != OrderStatus.Returned
                        && o.Status != OrderStatus.PendingRefund)
            .Select(o => new { o.StoreId, o.CreatedAt, o.TotalAmount, o.CustomerId })
            .ToListAsync(ct);

        var byStoreDay = orders
            .GroupBy(o => (o.StoreId, Day: o.CreatedAt.Date))
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Orders = g.Count(),
                    Revenue = g.Sum(x => x.TotalAmount),
                    NewCustomers = g.Select(x => x.CustomerId).Where(c => c != null).Distinct().Count()
                });

        // عدّاد التحميل الكلي لكل اشتراك (لحساب صافي التحميلات في اليوم).
        var downloadCounters = await db.StoreAppSubscriptions
            .AsNoTracking()
            .Where(s => s.Status == SubscriptionStatus.Active)
            .GroupBy(s => s.StoreId)
            .Select(g => new { StoreId = g.Key, Downloads = g.Sum(s => s.DownloadCount) })
            .ToDictionaryAsync(x => x.StoreId, x => x.Downloads, ct);

        // الصفوف الموجودة مسبقًا في النافذة لتحديثها بدل تكرارها.
        var existing = await db.StoreAppStats
            .Where(s => activeStoreIds.Contains(s.StoreId) && s.StatDate >= windowStart)
            .ToListAsync(ct);
        var existingMap = existing.ToDictionary(s => (s.StoreId, s.StatDate.Date));

        // نُحدّث الأيام التي فيها بيانات (طلبات أو تحميلات) خلال النافذة.
        var touched = new HashSet<(long, DateTime)>();
        foreach (var kv in byStoreDay)
        {
            var (storeId, day) = kv.Key;
            if (day < windowStart) continue;
            touched.Add((storeId, day));
        }

        // تحميلات اليوم: نقارن العدّاد الكلي بعدد التحميلات المسجّلة سابقًا في الصفوف.
        foreach (var storeId in activeStoreIds)
        {
            var totalDownloads = downloadCounters.GetValueOrDefault(storeId);
            var recordedInstalls = existing.Where(s => s.StoreId == storeId).Sum(s => s.Installs);
            var deltaInstalls = Math.Max(0, totalDownloads - recordedInstalls);
            if (deltaInstalls > 0)
            {
                touched.Add((storeId, today));
            }
        }

        foreach (var (storeId, day) in touched)
        {
            var hasOrderData = byStoreDay.TryGetValue((storeId, day), out var od);
            if (!existingMap.TryGetValue((storeId, day), out var row))
            {
                row = new StoreAppStat { StoreId = storeId, StatDate = day };
                db.StoreAppStats.Add(row);
                existingMap[(storeId, day)] = row;
            }

            if (hasOrderData)
            {
                row.Orders = od!.Orders;
                row.Revenue = od.Revenue;
                row.NewCustomers = od.NewCustomers;
                // تقدير الجلسات: كل طلب يمثّل جلسة على الأقل (إن لم تتوفّر بيانات أعمق).
                row.Sessions = Math.Max(row.Sessions, od.Orders);
            }

            if (day == today)
            {
                var totalDownloads = downloadCounters.GetValueOrDefault(storeId);
                var recordedInstalls = existing.Where(s => s.StoreId == storeId && s.StatDate.Date != today).Sum(s => s.Installs);
                row.Installs = Math.Max(0, totalDownloads - recordedInstalls);
            }

            row.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    // ── إرسال الإشعارات المجدولة المستحقّة ──
    private async Task DispatchScheduledNotificationsAsync(AppDbContext db, CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        var due = await db.StoreAppNotifications
            .Where(n => n.Kind == "Scheduled"
                        && n.Status == "Scheduled"
                        && n.ScheduledAt != null
                        && n.ScheduledAt <= now)
            .Take(200)
            .ToListAsync(ct);

        if (due.Count == 0) return;

        foreach (var n in due)
        {
            // عدد عملاء المتجر كتقدير لعدد المستلمين.
            n.RecipientsCount = await db.StoreCustomers.AsNoTracking()
                .CountAsync(c => c.StoreId == n.StoreId, ct);
            n.Status = "Sent";
            n.SentAt = now;
            n.UpdatedAt = now;
        }

        await db.SaveChangesAsync(ct);
        _logger.LogInformation("تم إرسال {Count} إشعار مجدول لتطبيقات المتاجر", due.Count);
    }
}
