using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class ProductImage : BaseEntity
{
    public long ProductId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int SortOrder { get; set; } = 0;

    // Navigation Properties
    public Product Product { get; set; } = null!;
}