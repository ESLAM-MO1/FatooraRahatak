using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Customers;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class OwnerCustomerService : IOwnerCustomerService
{
    private readonly AppDbContext _context;

    public OwnerCustomerService(AppDbContext context)
    {
        _context = context;
    }

    // ملاحظة تصميم (كما نص التاسك): التجميع يتم على Orders مباشرة
    // (CustomerId للمسجلين، GuestPhone للضيوف)، وليس جدول Users وحده.
    public async Task<List<OwnerCustomerListDto>> GetOwnerCustomersAsync(long storeId)
    {
        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Where(o => o.StoreId == storeId)
            .ToListAsync();

        return orders
            .GroupBy(o => o.CustomerId != null ? $"customer:{o.CustomerId}" : $"guest:{o.GuestPhone}")
            .Select(g =>
            {
                var first = g.First();
                var isGuest = first.CustomerId == null;

                return new OwnerCustomerListDto
                {
                    Name = isGuest ? (first.GuestName ?? "غير معروف") : first.Customer!.FullName,
                    Phone = isGuest ? (first.GuestPhone ?? string.Empty) : first.Customer!.Phone,
                    Email = isGuest ? first.GuestEmail : first.Customer!.Email,
                    OrdersCount = g.Count(),
                    TotalSpent = g.Sum(o => o.TotalAmount),
                    LastOrderDate = g.Max(o => o.CreatedAt),
                    IsGuest = isGuest
                };
            })
            .OrderByDescending(c => c.LastOrderDate)
            .ToList();
    }

    public async Task<OwnerCustomerDetailDto?> GetOwnerCustomerDetailAsync(long storeId, string phone)
    {
        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Where(o => o.StoreId == storeId &&
                ((o.CustomerId != null && o.Customer!.Phone == phone) ||
                 (o.CustomerId == null && o.GuestPhone == phone)))
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        if (orders.Count == 0) return null;

        var first = orders.First();
        var isGuest = first.CustomerId == null;

        return new OwnerCustomerDetailDto
        {
            Name = isGuest ? (first.GuestName ?? "غير معروف") : first.Customer!.FullName,
            Phone = phone,
            Email = isGuest ? first.GuestEmail : first.Customer!.Email,
            IsGuest = isGuest,
            OrdersCount = orders.Count,
            TotalSpent = orders.Sum(o => o.TotalAmount),
            Orders = orders.Select(o => new OwnerCustomerOrderDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                TotalAmount = o.TotalAmount,
                Status = o.Status.ToString(),
                ItemsCount = o.Items.Count,
                CreatedAt = o.CreatedAt
            }).ToList()
        };
    }
}