using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class ProductService : IProductService
{
    private readonly AppDbContext _context;

    public ProductService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ProductResponseDto> CreateAsync(long storeId, long userId, CreateProductDto dto)
    {

        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == storeId);

        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (store.Package.MaxProducts.HasValue)
        {
            var currentCount = await _context.Products.CountAsync(p => p.StoreId == storeId);
            if (currentCount >= store.Package.MaxProducts.Value)
                throw new InvalidOperationException(
                    $"وصلت للحد الأقصى لعدد المنتجات في باقتك الحالية ({store.Package.MaxProducts.Value} منتج). قم بترقية باقتك لإضافة المزيد.");
        }

        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == dto.CategoryId.Value && c.StoreId == storeId);
            if (!categoryExists)
                throw new InvalidOperationException("التصنيف غير موجود");
        }

        var sku = string.IsNullOrWhiteSpace(dto.Sku)
            ? $"PRD-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
            : dto.Sku;

        var skuExists = await _context.Products.AnyAsync(p => p.StoreId == storeId && p.Sku == sku);
        if (skuExists)
            throw new InvalidOperationException("رمز المنتج (SKU) مستخدم بالفعل في هذا المتجر");

        var product = new Product
        {
            StoreId = storeId,
            CategoryId = dto.CategoryId,
            NameAr = dto.NameAr,
            NameEn = dto.NameEn,
            DescriptionAr = dto.DescriptionAr,
            DescriptionEn = dto.DescriptionEn,
            Sku = sku,
            Barcode = dto.Barcode,
            BasePrice = dto.BasePrice,
            DiscountPrice = dto.DiscountPrice,
            CostPrice = dto.CostPrice,
            Weight = dto.Weight,
            HasVariants = false,
            Status = ProductStatus.Active
        };

        _context.Products.Add(product);
        await _context.SaveChangesAsync();

        var defaultWarehouse = await _context.Warehouses
            .FirstOrDefaultAsync(w => w.StoreId == storeId && w.IsDefault);

        if (defaultWarehouse != null)
        {
            var stock = new InventoryStock
            {
                WarehouseId = defaultWarehouse.Id,
                ProductId = product.Id,
                VariantId = null,
                QuantityAvailable = dto.InitialQuantity,
                QuantityReserved = 0,
                ReorderLevel = 0
            };
            _context.InventoryStocks.Add(stock);

            if (dto.InitialQuantity > 0)
            {
                _context.InventoryTransactions.Add(new InventoryTransaction
                {
                    WarehouseId = defaultWarehouse.Id,
                    ProductId = product.Id,
                    VariantId = null,
                    TransactionType = InventoryTransactionType.Adjustment,
                    Quantity = dto.InitialQuantity,
                    ReferenceType = "InitialStock",
                    ReferenceId = null,
                    CreatedByUserId = userId
                });
            }

            await _context.SaveChangesAsync();
        }

        return await MapToDtoAsync(product);
    }

    public async Task<List<ProductResponseDto>> GetAllAsync(long storeId)
    {
        var products = await _context.Products
            .Where(p => p.StoreId == storeId)
            .ToListAsync();

        var result = new List<ProductResponseDto>();
        foreach (var p in products)
            result.Add(await MapToDtoAsync(p));

        return result;
    }

    public async Task<ProductResponseDto?> GetByIdAsync(long storeId, long productId)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == storeId);

        return product == null ? null : await MapToDtoAsync(product);
    }

    public async Task<ProductResponseDto> UpdateAsync(long storeId, long productId, CreateProductDto dto)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == storeId);

        if (product == null)
            throw new InvalidOperationException("المنتج غير موجود");

        if (dto.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == dto.CategoryId.Value && c.StoreId == storeId);
            if (!categoryExists)
                throw new InvalidOperationException("التصنيف غير موجود");
        }

        product.CategoryId = dto.CategoryId;
        product.NameAr = dto.NameAr;
        product.NameEn = dto.NameEn;
        product.DescriptionAr = dto.DescriptionAr;
        product.DescriptionEn = dto.DescriptionEn;
        product.Barcode = dto.Barcode;
        product.BasePrice = dto.BasePrice;
        product.DiscountPrice = dto.DiscountPrice;
        product.Weight = dto.Weight;
        product.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return await MapToDtoAsync(product);
    }

    public async Task DeleteAsync(long storeId, long productId)
    {
        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == storeId);

        if (product == null)
            throw new InvalidOperationException("المنتج غير موجود");

        product.Status = ProductStatus.Archived;
        product.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }

    private async Task<ProductResponseDto> MapToDtoAsync(Product p)
    {
        var totalQuantity = await _context.InventoryStocks
            .Where(s => s.ProductId == p.Id)
            .SumAsync(s => (int?)s.QuantityAvailable) ?? 0;

        return new ProductResponseDto
        {
            Id = p.Id,
            CategoryId = p.CategoryId,
            NameAr = p.NameAr,
            NameEn = p.NameEn,
            DescriptionAr = p.DescriptionAr,
            DescriptionEn = p.DescriptionEn,
            Sku = p.Sku,
            Barcode = p.Barcode,
            BasePrice = p.BasePrice,
            DiscountPrice = p.DiscountPrice,
            CostPrice = p.CostPrice,
            Weight = p.Weight,
            Status = p.Status.ToString(),
            AvailableQuantity = totalQuantity
        };
    }
}