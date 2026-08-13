using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Dashboard;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class OwnerDashboardService : IOwnerDashboardService
{
    private readonly AppDbContext _context;

    public OwnerDashboardService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<OwnerDashboardStatsDto> GetStatsAsync(long storeId, string period)
    {
        var (from, to) = GetDateRange(period);

        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Where(o => o.StoreId == storeId && o.CreatedAt >= from && o.CreatedAt <= to)
            .ToListAsync();

        var totalSales = orders.Sum(o => o.TotalAmount);

        // مبيعات الفواتير (POS/فواتير مباشرة) في نفس الفترة
        var invoices = await _context.Invoices
            .Where(i => i.StoreId == storeId
                && i.InvoiceType == InvoiceType.Sales
                && i.InvoiceDate >= DateOnly.FromDateTime(from)
                && i.InvoiceDate <= DateOnly.FromDateTime(to))
            .ToListAsync();

        var posSales = invoices.Sum(i => i.TotalAmount);

        var ordersCountByStatus = orders
            .GroupBy(o => o.Status)
            .Select(g => new OrderStatusCountDto
            {
                Status = g.Key.ToString(),
                Count = g.Count()
            })
            .ToList();

        var topSellingProducts = orders
            .SelectMany(o => o.Items)
            .GroupBy(i => new { i.ProductId, i.ProductNameSnapshot })
            .Select(g => new TopSellingProductDto
            {
                ProductId = g.Key.ProductId,
                ProductName = g.Key.ProductNameSnapshot,
                TotalQuantitySold = g.Sum(i => i.Quantity)
            })
            .OrderByDescending(p => p.TotalQuantitySold)
            .Take(5)
            .ToList();

        var topBuyingCustomers = orders
            .GroupBy(o => o.CustomerId != null ? $"customer:{o.CustomerId}" : $"guest:{o.GuestPhone}")
            .Select(g =>
            {
                var first = g.First();
                var isGuest = first.CustomerId == null;
                return new TopBuyingCustomerDto
                {
                    Name = isGuest ? (first.GuestName ?? "غير معروف") : first.Customer!.FullName,
                    Phone = isGuest ? (first.GuestPhone ?? string.Empty) : first.Customer!.Phone,
                    TotalSpent = g.Sum(o => o.TotalAmount),
                    OrdersCount = g.Count()
                };
            })
            .OrderByDescending(c => c.TotalSpent)
            .Take(5)
            .ToList();

        return new OwnerDashboardStatsDto
        {
            TotalSales = totalSales,
            TotalPosSales = posSales,
            InvoicesCount = invoices.Count,
            NewOrdersCount = orders.Count(o => o.Status == OrderStatus.New),
            OrdersCountByStatus = ordersCountByStatus,
            TopSellingProducts = topSellingProducts,
            TopBuyingCustomers = topBuyingCustomers
        };
    }

    private static (DateTime from, DateTime to) GetDateRange(string period)
    {
        var now = DateTime.UtcNow;

        DateTime from = period switch
        {
            "daily" => new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc),
            "monthly" => new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            "yearly" => new DateTime(now.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => throw new ArgumentException("الفترة غير صحيحة")
        };

        return (from, now);
    }
}