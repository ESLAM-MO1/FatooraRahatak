using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;

namespace FatooraRahatak.Domain.Entities.Orders;

public class OrderItem : BaseEntity
{
    public long OrderId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPriceSnapshot { get; set; }
    public decimal LineTotal { get; set; }

    public Order Order { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}