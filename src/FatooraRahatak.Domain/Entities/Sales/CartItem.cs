using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;

namespace FatooraRahatak.Domain.Entities.Sales;

public class CartItem : BaseEntity
{
    public long CartId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtAdd { get; set; } 

    public Cart Cart { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}