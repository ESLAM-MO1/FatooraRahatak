using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Products;

public class Product : BaseEntity
{
    public long StoreId { get; set; }
    public long? CategoryId { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string Sku { get; set; } = string.Empty;
    public string? Barcode { get; set; }
    public decimal BasePrice { get; set; }
    public decimal? DiscountPrice { get; set; }
    public decimal CostPrice { get; set; } = 0; 
    public bool HasVariants { get; set; } = false;
    public bool HasWarranty { get; set; } = false;
    public int? WarrantyMonths { get; set; }
    public decimal? Weight { get; set; }
    public ProductStatus Status { get; set; } = ProductStatus.Draft;
    public ProductType ProductType { get; set; } = ProductType.Physical;
    public int? PrepTimeMinutes { get; set; }
    public string? IngredientsText { get; set; }
    public string? DigitalFileUrl { get; set; }
    public string? Slug { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
    public System.DateTime? DiscountStartsAt { get; set; }
    public System.DateTime? DiscountEndsAt { get; set; }

    public Store Store { get; set; } = null!;
    public Category? Category { get; set; }
    public ICollection<ProductVariant> Variants { get; set; } = new List<ProductVariant>();
    public ICollection<ProductImage> Images { get; set; } = new List<ProductImage>();
    public ICollection<CardCode> CardCodes { get; set; } = new List<CardCode>();
    public ICollection<BundleItem> BundleItems { get; set; } = new List<BundleItem>();
}