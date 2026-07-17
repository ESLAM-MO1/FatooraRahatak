using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Search;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SearchService : ISearchService
{
    private readonly AppDbContext _context;
    private const int MaxPerType = 5;

    public SearchService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<SearchResponseDto> SearchAsync(long storeId, string query)
    {
        var response = new SearchResponseDto();

        if (string.IsNullOrWhiteSpace(query) || query.Trim().Length < 2)
            return response;

        var term = query.Trim();

        var products = await _context.Products
            .Where(p => p.StoreId == storeId && (p.NameAr.Contains(term) || p.Sku.Contains(term)))
            .OrderByDescending(p => p.CreatedAt)
            .Take(MaxPerType)
            .Select(p => new SearchResultDto
            {
                Type = "product",
                Id = p.Id,
                Title = p.NameAr,
                Subtitle = p.Sku,
                Link = $"/dashboard/products/{p.Id}"
            })
            .ToListAsync();

        var categories = await _context.Categories
            .Where(c => c.StoreId == storeId && c.NameAr.Contains(term))
            .Take(MaxPerType)
            .Select(c => new SearchResultDto
            {
                Type = "category",
                Id = c.Id,
                Title = c.NameAr,
                Subtitle = null,
                Link = $"/dashboard/categories/{c.Id}"
            })
            .ToListAsync();

        var orders = await _context.Orders
            .Where(o => o.StoreId == storeId && o.OrderNumber.Contains(term))
            .OrderByDescending(o => o.CreatedAt)
            .Take(MaxPerType)
            .Select(o => new SearchResultDto
            {
                Type = "order",
                Id = o.Id,
                Title = o.OrderNumber,
                Subtitle = o.TotalAmount.ToString("0.00"),
                Link = $"/dashboard/orders/{o.Id}"
            })
            .ToListAsync();

        var customers = await _context.Orders
            .Where(o => o.StoreId == storeId)
            .Select(o => o.Customer)
            .Distinct()
            .Where(u => u != null && (u!.FullName.Contains(term) || u.Phone.Contains(term) || u.Email.Contains(term)))
            .Take(MaxPerType)
            .Select(u => new SearchResultDto
            {
                Type = "customer",
                Id = u!.Id,
                Title = u.FullName,
                Subtitle = u.Phone,
                Link = $"/dashboard/customers/{u.Id}"
            })
            .ToListAsync();

        var employees = await _context.Employees
            .Where(e => e.StoreId == storeId && e.User.FullName.Contains(term))
            .Take(MaxPerType)
            .Select(e => new SearchResultDto
            {
                Type = "employee",
                Id = e.Id,
                Title = e.User.FullName,
                Subtitle = e.User.Email,
                Link = $"/dashboard/employees/{e.Id}"
            })
            .ToListAsync();

        var coupons = await _context.Coupons
            .Where(c => c.StoreId == storeId && c.Code.Contains(term))
            .Take(MaxPerType)
            .Select(c => new SearchResultDto
            {
                Type = "coupon",
                Id = c.Id,
                Title = c.Code,
                Subtitle = null,
                Link = $"/dashboard/coupons/{c.Id}"
            })
            .ToListAsync();

        var invoices = await _context.Invoices
            .Where(i => i.StoreId == storeId && i.InvoiceNumber.Contains(term))
            .OrderByDescending(i => i.CreatedAt)
            .Take(MaxPerType)
            .Select(i => new SearchResultDto
            {
                Type = "invoice",
                Id = i.Id,
                Title = i.InvoiceNumber,
                Subtitle = i.TotalAmount.ToString("0.00"),
                Link = $"/dashboard/accounting/invoices/{i.Id}"
            })
            .ToListAsync();

        response.Results.AddRange(products);
        response.Results.AddRange(categories);
        response.Results.AddRange(orders);
        response.Results.AddRange(customers);
        response.Results.AddRange(employees);
        response.Results.AddRange(coupons);
        response.Results.AddRange(invoices);

        return response;
    }
}