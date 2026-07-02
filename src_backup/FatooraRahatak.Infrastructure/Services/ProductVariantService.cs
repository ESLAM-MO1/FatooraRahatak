using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class ProductVariantService : IProductVariantService
{
    private readonly AppDbContext _context;

    public ProductVariantService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<Product> GetOwnedProductAsync(long storeId, long productId)
    {
        var product = await _context.Products.FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == storeId);
        if (product == null)
            throw new InvalidOperationException("المنتج غير موجود");
        return product;
    }

    public async Task<VariantResponseDto> CreateVariantAsync(long storeId, long userId, long productId, CreateVariantDto dto)
    {
        var product = await GetOwnedProductAsync(storeId, productId);

        var sku = string.IsNullOrWhiteSpace(dto.Sku)
            ? $"VAR-{DateTime.UtcNow:yyMMdd}-{Guid.NewGuid().ToString()[..6].ToUpper()}"
            : dto.Sku;

        var skuExists = await _context.ProductVariants.AnyAsync(v => v.Sku == sku);
        if (skuExists)
            throw new InvalidOperationException("رمز المتغير (SKU) مستخدم بالفعل");

        var variant = new ProductVariant
        {
            ProductId = productId,
            VariantName = dto.VariantName,
            Sku = sku,
            Barcode = dto.Barcode,
            PriceAdjustment = dto.PriceAdjustment
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync();

        foreach (var attr in dto.Attributes)
        {
            _context.VariantAttributes.Add(new VariantAttribute
            {
                VariantId = variant.Id,
                AttributeName = attr.AttributeName,
                AttributeValue = attr.AttributeValue
            });
        }

        // تفعيل HasVariants على المنتج الأب
        product.HasVariants = true;
        product.UpdatedAt = DateTime.UtcNow;

        // إنشاء سطر مخزون ابتدائي للمتغير في المستودع الافتراضي
        var defaultWarehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.StoreId == storeId && w.IsDefault);
        if (defaultWarehouse != null)
        {
            _context.InventoryStocks.Add(new InventoryStock
            {
                WarehouseId = defaultWarehouse.Id,
                ProductId = productId,
                VariantId = variant.Id,
                QuantityAvailable = dto.InitialQuantity,
                QuantityReserved = 0,
                ReorderLevel = 0
            });

            if (dto.InitialQuantity > 0)
            {
                _context.InventoryTransactions.Add(new InventoryTransaction
                {
                    WarehouseId = defaultWarehouse.Id,
                    ProductId = productId,
                    VariantId = variant.Id,
                    TransactionType = InventoryTransactionType.Adjustment,
                    Quantity = dto.InitialQuantity,
                    ReferenceType = "InitialStock",
                    ReferenceId = null,
                    CreatedByUserId = userId
                });
            }
        }

        await _context.SaveChangesAsync();

        return await MapToDtoAsync(variant);
    }

    public async Task<List<VariantResponseDto>> GetVariantsAsync(long storeId, long productId)
    {
        await GetOwnedProductAsync(storeId, productId);

        var variants = await _context.ProductVariants
            .Where(v => v.ProductId == productId)
            .ToListAsync();

        var result = new List<VariantResponseDto>();
        foreach (var v in variants)
            result.Add(await MapToDtoAsync(v));

        return result;
    }

    public async Task DeleteVariantAsync(long storeId, long productId, long variantId)
    {
        await GetOwnedProductAsync(storeId, productId);

        var variant = await _context.ProductVariants
            .FirstOrDefaultAsync(v => v.Id == variantId && v.ProductId == productId);

        if (variant == null)
            throw new InvalidOperationException("المتغير غير موجود");

        var attributes = _context.VariantAttributes.Where(a => a.VariantId == variantId);
        _context.VariantAttributes.RemoveRange(attributes);

        var stocks = _context.InventoryStocks.Where(s => s.VariantId == variantId);
        _context.InventoryStocks.RemoveRange(stocks);

        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();
    }

    public async Task<ProductImageResponseDto> AddImageAsync(long storeId, long productId, AddProductImageDto dto)
    {
        await GetOwnedProductAsync(storeId, productId);

        if (dto.IsPrimary)
        {
            var existingImages = await _context.ProductImages.Where(i => i.ProductId == productId).ToListAsync();
            foreach (var img in existingImages)
                img.IsPrimary = false;
        }

        var image = new ProductImage
        {
            ProductId = productId,
            ImageUrl = dto.ImageUrl,
            IsPrimary = dto.IsPrimary,
            SortOrder = dto.SortOrder
        };

        _context.ProductImages.Add(image);
        await _context.SaveChangesAsync();

        return new ProductImageResponseDto
        {
            Id = image.Id,
            ImageUrl = image.ImageUrl,
            IsPrimary = image.IsPrimary,
            SortOrder = image.SortOrder
        };
    }

    public async Task<List<ProductImageResponseDto>> GetImagesAsync(long storeId, long productId)
    {
        await GetOwnedProductAsync(storeId, productId);

        return await _context.ProductImages
            .Where(i => i.ProductId == productId)
            .OrderBy(i => i.SortOrder)
            .Select(i => new ProductImageResponseDto
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                IsPrimary = i.IsPrimary,
                SortOrder = i.SortOrder
            })
            .ToListAsync();
    }

    public async Task DeleteImageAsync(long storeId, long productId, long imageId)
    {
        await GetOwnedProductAsync(storeId, productId);

        var image = await _context.ProductImages
            .FirstOrDefaultAsync(i => i.Id == imageId && i.ProductId == productId);

        if (image == null)
            throw new InvalidOperationException("الصورة غير موجودة");

        _context.ProductImages.Remove(image);
        await _context.SaveChangesAsync();
    }

    private async Task<VariantResponseDto> MapToDtoAsync(ProductVariant v)
    {
        var quantity = await _context.InventoryStocks
            .Where(s => s.VariantId == v.Id)
            .SumAsync(s => (int?)s.QuantityAvailable) ?? 0;

        var attributes = await _context.VariantAttributes
            .Where(a => a.VariantId == v.Id)
            .Select(a => new VariantAttributeDto
            {
                AttributeName = a.AttributeName,
                AttributeValue = a.AttributeValue
            })
            .ToListAsync();

        return new VariantResponseDto
        {
            Id = v.Id,
            VariantName = v.VariantName,
            Sku = v.Sku,
            Barcode = v.Barcode,
            PriceAdjustment = v.PriceAdjustment,
            AvailableQuantity = quantity,
            Attributes = attributes
        };
    }
}