using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// مُتابع بناء تطبيقات الجوال (APK) خلفيًا.
/// يفحص كل فترة الاشتراكات التي لها بناء بحالة Queued/Running، ويستدعي خدمة
/// البناء لتحديث الحالة من GitHub (RefreshBuildAsync). عند اكتمال البناء بنجاح
/// تُنزَّل حزمة الـ APK تلقائيًا إلى السيرفر ويُخزَّن مفتاح التوقيع لأول مرة،
/// بلا حاجة إلى ضغط الأدمن على "تحديث". هكذا تكتمل دورة "بناء → جاهز للتحميل"
/// تلقائيًا كما في صانع تطبيقات سلة.
/// </summary>
public class MobileAppBuildPollBackgroundService : BackgroundService
{
    // كل دقيقتين: البناء عبر GitHub Actions يستغرق دقائق، فلا داعي لاستقصاء أسرع.
    private static readonly TimeSpan PollInterval = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MobileAppBuildPollBackgroundService> _logger;

    public MobileAppBuildPollBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<MobileAppBuildPollBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // مهلة بدء قصيرة حتى يستقرّ النظام قبل أول دورة.
        try { await Task.Delay(TimeSpan.FromSeconds(45), stoppingToken); }
        catch (TaskCanceledException) { return; }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCycleAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشلت دورة متابعة بناء التطبيقات");
            }

            try { await Task.Delay(PollInterval, stoppingToken); }
            catch (TaskCanceledException) { break; }
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var buildService = scope.ServiceProvider.GetRequiredService<IMobileAppBuildService>();

        // أقصى 20 بناء نشط في الدورة الواحدة لتفادي إثقال GitHub/الشبكة.
        var activeIds = await db.StoreAppBuilds
            .AsNoTracking()
            .Where(b => b.Status == "Queued" || b.Status == "Running")
            .OrderBy(b => b.CreatedAt)
            .Select(b => b.Id)
            .Take(20)
            .ToListAsync(ct);

        if (activeIds.Count == 0) return;

        _logger.LogInformation("متابعة {Count} بناء نشط", activeIds.Count);

        foreach (var id in activeIds)
        {
            if (ct.IsCancellationRequested) break;
            try
            {
                // RefreshBuildAsync يحدّث الحالة، وينزّل الـ APK عند النجاح،
                // ويخزّن مفتاح التوقيع إن كان هذا أول بناء ناجح.
                await buildService.RefreshBuildAsync(id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "تعذّر تحديث حالة البناء {Id}", id);
            }
        }
    }
}
