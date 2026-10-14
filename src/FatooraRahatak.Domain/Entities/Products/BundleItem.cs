using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class BundleItem : BaseEntity
{
    public long BundleProductId { get; set; }
    public long ItemProductId { get; set; }
    public int Quantity { get; set; } = 1;

    public Product BundleProduct { get; set; } = null!;
    public Product ItemProduct { get; set; } = null!;
}
