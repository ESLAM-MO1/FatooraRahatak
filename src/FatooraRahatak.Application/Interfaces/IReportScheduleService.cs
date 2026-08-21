using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface IReportScheduleService
{
    Task<List<ReportScheduleDto>> GetAllAsync();
    Task<ReportScheduleDto> CreateAsync(CreateReportScheduleDto dto);
    Task<ReportScheduleDto> UpdateAsync(long id, CreateReportScheduleDto dto);
    Task DeleteAsync(long id);
    Task ToggleAsync(long id);
    Task<ReportConfigDto> GetConfigAsync();
    Task UpdateConfigAsync(List<string> selectedKpis);

    /// <summary>
    /// يصدّر تقرير فوري (PDF/Excel/CSV) بناءً على النطاق (Business/Platform) ومؤشرات الـ KPI المختارة حاليًا.
    /// </summary>
    Task<byte[]> ExportOverviewAsync(string scope, List<string> kpis, string format);

    /// <summary>
    /// يصدّر تقرير جدول تقارير موجود بالفعل، بنفس نطاقه ومؤشراته المحفوظة.
    /// </summary>
    Task<byte[]> ExportScheduleAsync(long id, string format);
}