using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class PublicStoreService : IPublicStoreService
{
    private readonly AppDbContext _context;

    public PublicStoreService(AppDbContext context)
    {
        _context = context;
    }

    // يستخدم فقط في GetStoreBySlugAsync — يرجّع المتجر حتى لو IsOnline = false،
    // عشان الواجهة تقدر تعرض "المتجر غير متاح حاليًا" بدل "المتجر غير موجود".
    private async Task<Domain.Entities.Stores.Store?> GetActiveStoreBySlugAsync(string slug)
    {
        return await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);
    }

    // يستخدم في كل باقي الـ Endpoints — بيقفل تمامًا لو المتجر معطّل (IsOnline = false).
    private async Task<Domain.Entities.Stores.Store?> GetOnlineStoreBySlugAsync(string slug)
    {
        return await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active && s.IsOnline);
    }

    public async Task<PublicStoreDto?> GetStoreBySlugAsync(string slug)
    {
        var store = await GetActiveStoreBySlugAsync(slug);
        if (store == null) return null;

        return new PublicStoreDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            Logo = store.Logo,
            DefaultLanguage = store.DefaultLanguage,
            IsOnline = store.IsOnline
        };
    }

    public async Task<List<PublicCategoryDto>?> GetCategoriesAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return await _context.Categories
            .Where(c => c.StoreId == store.Id && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new PublicCategoryDto
            {
                Id = c.Id,
                NameAr = c.NameAr,
                NameEn = c.NameEn,
                Image = c.Image,
                ParentCategoryId = c.ParentCategoryId
            })
            .ToListAsync();
    }

    public async Task<List<PublicProductDto>?> GetProductsAsync(string slug, long? categoryId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var query = _context.Products
            .Include(p => p.Images)
            .Where(p => p.StoreId == store.Id && p.Status == ProductStatus.Active);

        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        var products = await query.ToListAsync();
        var productIds = products.Select(p => p.Id).ToList();

        var quantities = await _context.InventoryStocks
            .Where(i => productIds.Contains(i.ProductId))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Total = g.Sum(x => x.QuantityAvailable) })
            .ToListAsync();

        var quantityMap = quantities.ToDictionary(q => q.ProductId, q => q.Total);

        return products.Select(p => new PublicProductDto
        {
            Id = p.Id,
            NameAr = p.NameAr,
            NameEn = p.NameEn,
            BasePrice = p.BasePrice,
            DiscountPrice = p.DiscountPrice,
            Sku = p.Sku,
            AvailableQuantity = quantityMap.TryGetValue(p.Id, out var qty) ? qty : 0,
            PrimaryImageUrl = p.Images
                .OrderByDescending(i => i.IsPrimary)
                .ThenBy(i => i.SortOrder)
                .Select(i => i.ImageUrl)
                .FirstOrDefault()
        }).ToList();
    }

    public async Task<PublicProductDetailDto?> GetProductDetailAsync(string slug, long productId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var product = await _context.Products
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p =>
                p.Id == productId &&
                p.StoreId == store.Id &&
                p.Status == ProductStatus.Active);

        if (product == null) return null;

        var stocks = await _context.InventoryStocks
            .Where(i => i.ProductId == productId)
            .ToListAsync();

        var totalQuantity = stocks.Sum(s => s.QuantityAvailable);

        var activeVariants = product.Variants.Where(v => v.IsActive).ToList();

        var variantDtos = activeVariants.Select(v => new PublicProductVariantDto
        {
            Id = v.Id,
            VariantName = v.VariantName,
            Sku = v.Sku,
            PriceAdjustment = v.PriceAdjustment,
            Image = v.Image,
            AvailableQuantity = stocks.Where(s => s.VariantId == v.Id).Sum(s => s.QuantityAvailable)
        }).ToList();

        return new PublicProductDetailDto
        {
            Id = product.Id,
            NameAr = product.NameAr,
            NameEn = product.NameEn,
            DescriptionAr = product.DescriptionAr,
            DescriptionEn = product.DescriptionEn,
            BasePrice = product.BasePrice,
            DiscountPrice = product.DiscountPrice,
            Sku = product.Sku,
            HasVariants = product.HasVariants,
            AvailableQuantity = totalQuantity,
            Images = product.Images
                .OrderByDescending(i => i.IsPrimary)
                .ThenBy(i => i.SortOrder)
                .Select(i => new PublicProductImageDto
                {
                    ImageUrl = i.ImageUrl,
                    IsPrimary = i.IsPrimary,
                    SortOrder = i.SortOrder
                }).ToList(),
            Variants = variantDtos
        };
    }

    public async Task<ReturnPolicyDto?> GetReturnPolicyAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return new ReturnPolicyDto
        {
            ReturnPolicyText = store.ReturnPolicyText
        };
    }

    public async Task<StoreContactDto?> GetContactAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return new StoreContactDto
        {
            Phone = store.ContactPhone,
            Email = store.ContactEmail,
            Address = store.ContactAddress
        };
    }

    public async Task<PublicOrderDetailDto?> GetOrderAsync(string slug, string orderNumber, string? phone, long? customerId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.StoreId == store.Id && o.OrderNumber == orderNumber);

        if (order == null) return null;

        var authorized = false;

        if (customerId != null && order.CustomerId == customerId)
        {
            authorized = true;
        }
        else if (!string.IsNullOrWhiteSpace(phone))
        {
            var expectedPhone = order.CustomerId != null ? order.Customer!.Phone : order.GuestPhone;
            authorized = expectedPhone == phone;
        }

        if (!authorized) return null;

        return new PublicOrderDetailDto
        {
            OrderNumber = order.OrderNumber,
            Status = order.Status.ToString(),
            SubTotal = order.SubTotal,
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.TotalAmount,
            ShippingAddress = order.ShippingAddress,
            Notes = order.Notes,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new PublicOrderItemDto
            {
                ProductNameSnapshot = i.ProductNameSnapshot,
                Quantity = i.Quantity,
                UnitPriceSnapshot = i.UnitPriceSnapshot,
                LineTotal = i.LineTotal
            }).ToList()
        };
    }
}