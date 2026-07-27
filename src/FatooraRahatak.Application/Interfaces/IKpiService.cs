using FatooraRahatak.Application.DTOs.Admin;

namespace FatooraRahatak.Application.Interfaces;

public interface IKpiService
{
    Task<KpiDashboardDto> GetKpiDashboardAsync();
}
