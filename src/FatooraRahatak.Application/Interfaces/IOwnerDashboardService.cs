using FatooraRahatak.Application.DTOs.Dashboard;

namespace FatooraRahatak.Application.Interfaces;

public interface IOwnerDashboardService
{
    Task<OwnerDashboardStatsDto> GetStatsAsync(long storeId, string period);
}