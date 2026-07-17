using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;

namespace FatooraRahatak.Domain.Entities.Accounting;

public class InvoiceItem : BaseEntity
{
    public long InvoiceId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; } // سعر البيع (فاتورة بيع) أو سعر الشراء الفعلي للوحدة (فاتورة شراء)
    public decimal LineTotal { get; set; }

    public Invoice Invoice { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
}