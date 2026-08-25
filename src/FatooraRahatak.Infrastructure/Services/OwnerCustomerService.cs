using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Customers;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Customers;
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
    // العملاء المضافون يدويًا (StoreCustomer) يُدمجون في القائمة أيضًا
    // حتى يظهر العميل الجديد فور إضافته.
    public async Task<List<OwnerCustomerListDto>> GetOwnerCustomersAsync(long storeId)
    {
        var orders = await _context.Orders
            .Include(o => o.Customer)
            .Where(o => o.StoreId == storeId)
            .ToListAsync();

        var manualCustomers = await _context.StoreCustomers
            .Where(c => c.StoreId == storeId)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        var orderCustomers = orders
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
                    IsGuest = isGuest,
                    CustomerId = isGuest ? null : first.CustomerId,
                };
            })
            .ToList();

        var manualDtos = manualCustomers.Select(c => new OwnerCustomerListDto
        {
            Name = c.FullName,
            Phone = c.Phone,
            Email = c.Email,
            OrdersCount = 0,
            TotalSpent = 0,
            LastOrderDate = c.CreatedAt,
            IsGuest = false,
            CustomerId = null,
        }).ToList();

        return orderCustomers
            .Concat(manualDtos)
            .OrderByDescending(c => c.LastOrderDate)
            .ToList();
    }

    public async Task<StoreCustomerDto> CreateStoreCustomerAsync(long storeId, CreateStoreCustomerDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new InvalidOperationException("اسم العميل مطلوب");
        if (string.IsNullOrWhiteSpace(dto.Phone))
            throw new InvalidOperationException("رقم الجوال مطلوب");

        var duplicate = await _context.StoreCustomers.AnyAsync(c =>
            c.StoreId == storeId && c.Phone == dto.Phone);
        if (duplicate)
            throw new InvalidOperationException("يوجد عميل بنفس رقم الجوال");

        var customer = new StoreCustomer
        {
            StoreId = storeId,
            FullName = dto.FullName.Trim(),
            Phone = dto.Phone.Trim(),
            Email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim(),
            Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim(),
            VatNumber = string.IsNullOrWhiteSpace(dto.VatNumber) ? null : dto.VatNumber.Trim(),
            Country = string.IsNullOrWhiteSpace(dto.Country) ? null : dto.Country.Trim(),
            Region = string.IsNullOrWhiteSpace(dto.Region) ? null : dto.Region.Trim(),
            City = string.IsNullOrWhiteSpace(dto.City) ? null : dto.City.Trim(),
            Street = string.IsNullOrWhiteSpace(dto.Street) ? null : dto.Street.Trim(),
            PostalCode = string.IsNullOrWhiteSpace(dto.PostalCode) ? null : dto.PostalCode.Trim(),
            BuildingNumber = string.IsNullOrWhiteSpace(dto.BuildingNumber) ? null : dto.BuildingNumber.Trim(),
            NationalAddress = string.IsNullOrWhiteSpace(dto.NationalAddress) ? null : dto.NationalAddress.Trim(),
        };

        _context.StoreCustomers.Add(customer);
        await _context.SaveChangesAsync();

        return new StoreCustomerDto
        {
            Id = customer.Id,
            FullName = customer.FullName,
            Phone = customer.Phone,
            Email = customer.Email,
            Notes = customer.Notes,
            VatNumber = customer.VatNumber,
            Country = customer.Country,
            Region = customer.Region,
            City = customer.City,
            Street = customer.Street,
            PostalCode = customer.PostalCode,
            BuildingNumber = customer.BuildingNumber,
            NationalAddress = customer.NationalAddress,
            CreatedAt = customer.CreatedAt,
        };
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
            CustomerId = isGuest ? null : first.CustomerId,
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