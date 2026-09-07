using System.Text.Json;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class ReportScheduleService : IReportScheduleService
{
    private const string ConfigKey = "Report_KpiSelection";
    private static readonly string[] AvailableKpis =
    {
        "Mrr", "Arr", "ActiveStores", "TrialToPaidConversion", "ChurnRate",
        "MonthlyGrowth", "PackageDistribution", "TopRevenueStores", "AtRiskStores"
    };

    private readonly AppDbContext _context;
    private readonly IKpiService _kpiService;

    public ReportScheduleService(AppDbContext context, IKpiService kpiService)
    {
        _context = context;
        _kpiService = kpiService;
    }

    public async Task<List<ReportScheduleDto>> GetAllAsync()
    {
        var list = await _context.ReportSchedules
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return list.Select(s => ToDto(s)).ToList();
    }

    public async Task<ReportScheduleDto> CreateAsync(CreateReportScheduleDto dto)
    {
        var schedule = new ReportSchedule
        {
            Name = dto.Name.Trim(),
            Frequency = NormalizeFrequency(dto.Frequency),
            ReportScope = dto.ReportScope == "Platform" ? "Platform" : "Business",
            KpisJson = JsonSerializer.Serialize(dto.Kpis ?? new()),
            RecipientsJson = JsonSerializer.Serialize(dto.Recipients ?? new()),
            IsActive = dto.IsActive,
            NextRunAt = CalculateNextRun(DateTime.UtcNow, NormalizeFrequency(dto.Frequency))
        };

        _context.ReportSchedules.Add(schedule);
        await _context.SaveChangesAsync();
        return ToDto(schedule);
    }

    public async Task<ReportScheduleDto> UpdateAsync(long id, CreateReportScheduleDto dto)
    {
        var schedule = await _context.ReportSchedules.FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            throw new InvalidOperationException("جدول التقرير غير موجود");

        schedule.Name = dto.Name.Trim();
        schedule.Frequency = NormalizeFrequency(dto.Frequency);
        schedule.ReportScope = dto.ReportScope == "Platform" ? "Platform" : "Business";
        schedule.KpisJson = JsonSerializer.Serialize(dto.Kpis ?? new());
        schedule.RecipientsJson = JsonSerializer.Serialize(dto.Recipients ?? new());
        schedule.IsActive = dto.IsActive;
        if (!schedule.IsActive || schedule.NextRunAt <= DateTime.UtcNow)
            schedule.NextRunAt = CalculateNextRun(DateTime.UtcNow, schedule.Frequency);
        schedule.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return ToDto(schedule);
    }

    public async Task DeleteAsync(long id)
    {
        var schedule = await _context.ReportSchedules.FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            throw new InvalidOperationException("جدول التقرير غير موجود");
        _context.ReportSchedules.Remove(schedule);
        await _context.SaveChangesAsync();
    }

    public async Task ToggleAsync(long id)
    {
        var schedule = await _context.ReportSchedules.FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            throw new InvalidOperationException("جدول التقرير غير موجود");
        schedule.IsActive = !schedule.IsActive;
        if (schedule.IsActive)
            schedule.NextRunAt = CalculateNextRun(DateTime.UtcNow, schedule.Frequency);
        schedule.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    public async Task<ReportConfigDto> GetConfigAsync()
    {
        var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == ConfigKey);
        var selected = new List<string>();
        if (setting != null)
        {
            try { selected = JsonSerializer.Deserialize<List<string>>(setting.SettingValue) ?? new(); }
            catch { selected = new(); }
        }
        return new ReportConfigDto
        {
            SelectedKpis = selected,
            AvailableKpis = AvailableKpis.ToList()
        };
    }

    public async Task UpdateConfigAsync(List<string> selectedKpis)
    {
        var cleaned = (selectedKpis ?? new()).Where(k => AvailableKpis.Contains(k)).Distinct().ToList();
        var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == ConfigKey);
        var value = JsonSerializer.Serialize(cleaned);
        if (setting == null)
            _context.PlatformSettings.Add(new PlatformSetting { SettingKey = ConfigKey, SettingValue = value });
        else
        {
            setting.SettingValue = value;
            setting.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
    }

    // === تصدير التقارير الفورية (PDF/Excel/CSV) ===

    public async Task<byte[]> ExportOverviewAsync(string scope, List<string> kpis, string format)
    {
        var (title, subtitle, headers, rows) = await BuildReportDataAsync(scope, kpis, null);
        return FormatBytes(format, title, subtitle, headers, rows);
    }

    public async Task<byte[]> ExportScheduleAsync(long id, string format)
    {
        var schedule = await _context.ReportSchedules.FirstOrDefaultAsync(s => s.Id == id);
        if (schedule == null)
            throw new InvalidOperationException("جدول التقرير غير موجود");

        List<string> kpis = new();
        try
        {
            if (!string.IsNullOrWhiteSpace(schedule.KpisJson))
                kpis = JsonSerializer.Deserialize<List<string>>(schedule.KpisJson) ?? new();
        }
        catch { }

        var (title, subtitle, headers, rows) = await BuildReportDataAsync(schedule.ReportScope, kpis, schedule.Name);
        return FormatBytes(format, title, subtitle, headers, rows);
    }

    /// <summary>
    /// يبني بيانات التقرير (عنوان + عنوان فرعي + رؤوس أعمدة + صفوف) حسب النطاق:
    /// - Platform: مؤشرات المنصة المختارة (من IKpiService).
    /// - Business: ملخص مبيعات المنصة يوميًا لآخر 30 يومًا.
    /// </summary>
    private async Task<(string Title, string Subtitle, string[] Headers, List<string[]> Rows)> BuildReportDataAsync(
        string scope, List<string>? kpis, string? nameOverride)
    {
        var cleanedKpis = (kpis ?? new()).Where(k => AvailableKpis.Contains(k)).ToList();
        if (cleanedKpis.Count == 0)
            cleanedKpis = AvailableKpis.ToList();

        if (scope == "Platform")
        {
            var dashboard = await _kpiService.GetKpiDashboardAsync();
            var rows = new List<string[]>();
            foreach (var kpi in cleanedKpis)
                rows.AddRange(PlatformKpiRows(kpi, dashboard));

            var title = string.IsNullOrWhiteSpace(nameOverride) ? "تقرير مؤشرات المنصة" : nameOverride!;
            var subtitle = $"تاريخ الإنشاء: {DateTime.UtcNow:yyyy-MM-dd HH:mm}";
            return (title, subtitle, new[] { "المؤشر", "القيمة" }, rows);
        }
        else
        {
            var to = DateOnly.FromDateTime(DateTime.UtcNow);
            var from = to.AddDays(-30);
            var start = from.ToDateTime(TimeOnly.MinValue);
            var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue);

            var orders = await _context.Orders
                .Where(o => o.CreatedAt >= start && o.CreatedAt < end
                    && o.Status != OrderStatus.Cancelled && o.Status != OrderStatus.PendingPayment)
                .Select(o => new { o.CreatedAt, o.TotalAmount })
                .ToListAsync();

            var rows = orders
                .GroupBy(o => DateOnly.FromDateTime(o.CreatedAt))
                .OrderBy(g => g.Key)
                .Select(g => new[] { g.Key.ToString("yyyy-MM-dd"), g.Count().ToString(), g.Sum(o => o.TotalAmount).ToString("0.00") })
                .ToList();

            var title = string.IsNullOrWhiteSpace(nameOverride) ? "ملخص مبيعات المنصة (آخر 30 يومًا)" : nameOverride!;
            var subtitle = $"الفترة: {from:yyyy-MM-dd} إلى {to:yyyy-MM-dd}";
            return (title, subtitle, new[] { "التاريخ", "عدد الطلبات", "الإيراد" }, rows);
        }
    }

    private static IEnumerable<string[]> PlatformKpiRows(string kpi, KpiDashboardDto d)
    {
        switch (kpi)
        {
            case "Mrr":
                yield return new[] { "الإيراد الشهري المتكرر (MRR)", d.Mrr.ToString("0.00") };
                break;
            case "Arr":
                yield return new[] { "الإيراد السنوي المتكرر (ARR)", d.Arr.ToString("0.00") };
                break;
            case "ActiveStores":
                yield return new[] { "المتاجر النشطة", d.ActiveStoresCount.ToString() };
                break;
            case "TrialToPaidConversion":
                yield return new[] { "معدل التحويل من التجربة", $"{d.TrialToPaidConversion:0.0}%" };
                break;
            case "ChurnRate":
                yield return new[] { "معدل الإيقاف (Churn)", $"{d.ChurnRate:0.0}%" };
                break;
            case "MonthlyGrowth":
                foreach (var p in d.MonthlyGrowth)
                    yield return new[] { $"النمو الشهري - {p.Month}", $"متاجر جديدة: {p.NewStores} / اشتراكات ملغاة: {p.CancelledSubscriptions}" };
                break;
            case "PackageDistribution":
                foreach (var p in d.PackageDistribution)
                    yield return new[] { $"توزيع الباقات - {p.PackageName}", $"{p.StoreCount} متجر" };
                break;
            case "TopRevenueStores":
                foreach (var s in d.TopRevenueStores)
                    yield return new[] { $"أعلى إيرادًا - {s.StoreName}", $"{s.MonthlyRevenue:0.00} ر.س" };
                break;
            case "AtRiskStores":
                foreach (var s in d.AtRiskStores)
                    yield return new[] { $"معرض للخطر - {s.StoreName}", s.LastLoginAt.HasValue ? s.LastLoginAt.Value.ToString("yyyy-MM-dd") : "لم يسجل دخول" };
                break;
        }
    }

    private static byte[] FormatBytes(string format, string title, string subtitle, string[] headers, List<string[]> rows)
    {
        var sheetName = title.Length > 31 ? title.Substring(0, 31) : title;
        return (format ?? "").ToLowerInvariant() switch
        {
            "excel" => ExcelExport.ToBytes(sheetName, headers, rows),
            "pdf" => PdfReportExport.ToBytes(title, subtitle, headers, rows),
            _ => CsvExport.ToBytes(headers, rows)
        };
    }

    public static DateTime CalculateNextRun(DateTime from, string frequency)
    {
        return frequency switch
        {
            "Daily" => from.AddDays(1),
            "Monthly" => from.AddMonths(1),
            _ => from.AddDays(7)
        };
    }

    private static string NormalizeFrequency(string f)
    {
        return f switch
        {
            "Daily" => "Daily",
            "Monthly" => "Monthly",
            _ => "Weekly"
        };
    }

    private static ReportScheduleDto ToDto(ReportSchedule s)
    {
        List<string> kpis = new();
        List<string> recipients = new();
        try
        {
            if (!string.IsNullOrWhiteSpace(s.KpisJson))
                kpis = JsonSerializer.Deserialize<List<string>>(s.KpisJson) ?? new();
            if (!string.IsNullOrWhiteSpace(s.RecipientsJson))
                recipients = JsonSerializer.Deserialize<List<string>>(s.RecipientsJson) ?? new();
        }
        catch { }

        return new ReportScheduleDto
        {
            Id = s.Id,
            Name = s.Name,
            Frequency = s.Frequency,
            ReportScope = s.ReportScope,
            Kpis = kpis,
            Recipients = recipients,
            IsActive = s.IsActive,
            LastRunAt = s.LastRunAt,
            NextRunAt = s.NextRunAt,
            CreatedAt = s.CreatedAt
        };
    }
}