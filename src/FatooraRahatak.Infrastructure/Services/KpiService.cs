using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class KpiService : IKpiService
{
    private readonly AppDbContext _context;

    public KpiService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<KpiDashboardDto> GetKpiDashboardAsync()
    {
        var now = DateTime.UtcNow;

        var stores = await _context.Stores
            .Include(s => s.Package)
            .Include(s => s.Owner)
            .Include(s => s.Subscriptions)
            .ToListAsync();

        var activeStores = stores.Where(s => s.Status == StoreStatus.Active).ToList();

        var allSubscriptions = await _context.Subscriptions
            .Include(s => s.Package)
            .Where(s => s.Store.Status == StoreStatus.Active)
            .ToListAsync();

        var activeSubs = allSubscriptions
            .Where(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.GracePeriod)
            .ToList();

        var mrr = activeSubs.Sum(s => s.Package.MonthlyPrice);
        var arr = mrr * 12;

        var paidSubs = activeSubs.Where(s => s.Package.MonthlyPrice > 0).Select(s => s.StoreId).Distinct();
        var totalNonSuspended = stores.Where(s => s.Status != StoreStatus.Suspended).Select(s => s.Id).Distinct().Count();
        var conversion = totalNonSuspended > 0
            ? Math.Round((double)paidSubs.Count() / totalNonSuspended * 100, 2)
            : 0;

        var thirtyDaysAgo = now.AddDays(-30);
        var activeCountBefore = allSubscriptions.Count(s => s.Status == SubscriptionStatus.Active
            || s.Status == SubscriptionStatus.GracePeriod
            || s.Status == SubscriptionStatus.Cancelled);
        var cancelledLast30 = allSubscriptions.Count(s => s.Status == SubscriptionStatus.Cancelled
            && s.CreatedAt >= thirtyDaysAgo
            && s.CreatedAt <= now);
        var churnRate = activeCountBefore > 0
            ? Math.Round((double)cancelledLast30 / activeCountBefore * 100, 2)
            : 0;

        var twelveMonthsAgo = now.AddMonths(-12);
        var months = new List<string>();
        var monthlyGrowth = new List<MonthlyGrowthPoint>();
        for (var i = 11; i >= 0; i--)
        {
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-i);
            var monthEnd = monthStart.AddMonths(1);
            var label = monthStart.ToString("MMM yyyy");

            var newStores = stores.Count(s => s.CreatedAt >= monthStart && s.CreatedAt < monthEnd);
            var cancelled = allSubscriptions.Count(s => s.Status == SubscriptionStatus.Cancelled
                && s.CreatedAt >= monthStart && s.CreatedAt < monthEnd);

            monthlyGrowth.Add(new MonthlyGrowthPoint
            {
                Month = label,
                NewStores = newStores,
                CancelledSubscriptions = cancelled
            });
        }

        var packageDist = activeStores
            .GroupBy(s => s.Package.PackageName)
            .Select(g => new PackageDistItem
            {
                PackageName = g.Key,
                StoreCount = g.Count()
            })
            .OrderByDescending(p => p.StoreCount)
            .ToList();

        var topRevenue = activeStores
            .Select(s => new TopRevenueStoreDto
            {
                Id = s.Id,
                StoreName = s.StoreName,
                PackageName = s.Package.PackageName,
                MonthlyRevenue = s.Package.MonthlyPrice
            })
            .OrderByDescending(s => s.MonthlyRevenue)
            .Take(10)
            .ToList();

        var fourteenDaysAgo = now.AddDays(-14);
        var atRisk = stores
            .Where(s => s.Status == StoreStatus.Active
                && (!s.Owner.LastLoginAt.HasValue || s.Owner.LastLoginAt < fourteenDaysAgo))
            .Select(s => new AtRiskStoreDto
            {
                Id = s.Id,
                StoreName = s.StoreName,
                OwnerName = s.Owner.FullName,
                OwnerEmail = s.Owner.Email,
                PackageName = s.Package.PackageName,
                LastLoginAt = s.Owner.LastLoginAt,
                CreatedAt = s.CreatedAt
            })
            .OrderBy(s => s.LastLoginAt ?? s.CreatedAt)
            .Take(20)
            .ToList();

        return new KpiDashboardDto
        {
            Mrr = mrr,
            Arr = arr,
            ActiveStoresCount = activeStores.Count,
            TrialToPaidConversion = conversion,
            ChurnRate = churnRate,
            MonthlyGrowth = monthlyGrowth,
            PackageDistribution = packageDist,
            TopRevenueStores = topRevenue,
            AtRiskStores = atRisk
        };
    }
}
