using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class ProductReview : BaseEntity
{
    public long StoreId { get; set; }
    public long ProductId { get; set; }
    public long? CustomerId { get; set; }
    public string CustomerName { get; set; } = string.Empty;
    public string? CustomerPhone { get; set; }
    public int Rating { get; set; }
    public string Comment { get; set; } = string.Empty;
    public bool IsApproved { get; set; } = true;

    public Product Product { get; set; } = null!;
}
