using System.Text;
using System.Text.Json;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.API.BackgroundServices;

/// <summary>
/// تنفيذ التقارير المجدولة (يومي/أسبوعي/شهري) وإرسالها تلقائيًا للمستلمين عبر البريد.
/// </summary>
public class ReportSchedulerBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ReportSchedulerBackgroundService> _logger;

    public ReportSchedulerBackgroundService(IServiceScopeFactory scopeFactory, ILogger<ReportSchedulerBackgroundService> logger)
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
                _logger.LogError(ex, "فشلت دورة تنفيذ التقارير المجدولة");
            }

            await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
        }
    }

    private async Task RunCycleAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var now = DateTime.UtcNow;

        var due = await db.ReportSchedules
            .Where(s => s.IsActive && s.NextRunAt <= now)
            .ToListAsync(ct);

        foreach (var schedule in due)
        {
            try
            {
                var (subject, body) = await BuildReportAsync(scope.ServiceProvider, schedule, now);

                var recipients = ParseList(schedule.RecipientsJson)
                    .Where(r => r.Contains('@')).Distinct().ToList();

                if (recipients.Count > 0 && emailService.IsConfigured())
                {
                    foreach (var recipient in recipients)
                        await emailService.SendEmailAsync(recipient, subject, body);
                }

                schedule.LastRunAt = now;
                schedule.NextRunAt = ReportScheduleService.CalculateNextRun(now, schedule.Frequency);
                schedule.UpdatedAt = now;
                await db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشل تنفيذ الجدول {ScheduleId}", schedule.Id);
            }
        }
    }

    private static async Task<(string Subject, string Body)> BuildReportAsync(IServiceProvider services, FatooraRahatak.Domain.Entities.Platform.ReportSchedule schedule, DateTime now)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var kpis = ParseList(schedule.KpisJson);

        if (schedule.ReportScope == "Platform")
        {
            var kpiService = services.GetRequiredService<IKpiService>();
            var dashboard = await kpiService.GetKpiDashboardAsync();

            var rows = new List<(string, string)>
            {
                ("MRR", dashboard.Mrr.ToString("N2")),
                ("ARR", dashboard.Arr.ToString("N2")),
                ("المتاجر النشطة", dashboard.ActiveStoresCount.ToString()),
                ("معدل التحويل من التجربة", dashboard.TrialToPaidConversion.ToString("P1")),
                ("معدل الإيقاف (Churn)", dashboard.ChurnRate.ToString("P1")),
            };

            if (kpis.Count > 0)
                rows = rows.Where(r => kpis.Contains(r.Item1, StringComparer.OrdinalIgnoreCase)).ToList();

            return (
                $"تقرير المنصة - {now:yyyy-MM-dd}",
                BuildHtmlTable("مؤشرات المنصة", rows));
        }

        var from = schedule.Frequency == "Daily"
            ? now.Date
            : schedule.Frequency == "Monthly"
                ? new DateTime(now.Year, now.Month, 1)
                : now.Date.AddDays(-7);

        var orders = await db.Orders
            .Where(o => o.CreatedAt >= from && o.CreatedAt <= now)
            .ToListAsync();

        var netSales = orders.Sum(o => o.TotalAmount);
        var discounts = orders.Sum(o => o.DiscountAmount);
        var count = orders.Count;

        var rowsBusiness = new List<(string, string)>
        {
            ("عدد الطلبات", count.ToString()),
            ("صافي المبيعات", netSales.ToString("N2")),
            ("الخصومات", discounts.ToString("N2")),
            ("متوسط قيمة الطلب", count > 0 ? (netSales / count).ToString("N2") : "0"),
        };

        return (
            $"تقرير المبيعات ({schedule.Frequency}) - {from:yyyy-MM-dd} إلى {now:yyyy-MM-dd}",
            BuildHtmlTable($"ملخص المبيعات ({schedule.Frequency})", rowsBusiness));
    }

    private static List<string> ParseList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new();
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? new(); }
        catch { return new(); }
    }

    private static string BuildHtmlTable(string title, List<(string Label, string Value)> rows)
    {
        var sb = new StringBuilder();
        sb.Append("<div dir=\"rtl\" style=\"font-family:Arial,sans-serif;color:#0d2b3e;\">");
        sb.Append($"<h2 style=\"color:#C9A227;\">{title}</h2>");
        sb.Append("<table border=\"1\" cellpadding=\"8\" cellspacing=\"0\" style=\"border-collapse:collapse;width:100%;\">");
        foreach (var (label, value) in rows)
        {
            sb.Append($"<tr><td style=\"background:#f5f7fa;font-weight:bold;\">{label}</td><td>{value}</td></tr>");
        }
        sb.Append("</table></div>");
        return sb.ToString();
    }
}
