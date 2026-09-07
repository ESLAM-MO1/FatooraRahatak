using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// توليد دفعات التسوية دوريًا للتجار (الفاصل الزمني قابل للتعديل من إعدادات المنصة):
/// Settlement_Enabled و Settlement_IntervalHours.
/// </summary>
public class SettlementBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SettlementBackgroundService> _logger;

    public SettlementBackgroundService(IServiceScopeFactory scopeFactory, ILogger<SettlementBackgroundService> logger)
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
                _logger.LogError(ex, "فشلت دورة إنشاء دفعات التسوية");
            }

            await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var settlementService = scope.ServiceProvider.GetRequiredService<ISettlementService>();

        var enabledSetting = await db.PlatformSettings
            .FirstOrDefaultAsync(p => p.SettingKey == "Settlement_Enabled", ct);
        if (enabledSetting != null && enabledSetting.SettingValue.Equals("false", StringComparison.OrdinalIgnoreCase))
            return;

        var intervalSetting = await db.PlatformSettings
            .FirstOrDefaultAsync(p => p.SettingKey == "Settlement_IntervalHours", ct);
        var intervalHours = 24;
        if (intervalSetting != null && int.TryParse(intervalSetting.SettingValue, out var parsed) && parsed > 0)
            intervalHours = parsed;

        var lastBatch = await db.SettlementBatches
            .OrderByDescending(b => b.CreatedAt)
            .FirstOrDefaultAsync(ct);

        if (lastBatch != null && lastBatch.CreatedAt.AddHours(intervalHours) > DateTime.UtcNow)
            return;

        try
        {
            await settlementService.GenerateSettlementBatchAsync();
            _logger.LogInformation("تم إنشاء دفعة تسوية تلقائيًا");
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogInformation("لا توجد طلبات مؤهلة للتسوية: {Message}", ex.Message);
        }
    }
}
