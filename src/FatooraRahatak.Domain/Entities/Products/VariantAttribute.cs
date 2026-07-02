using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class VariantAttribute : BaseEntity
{
    public long VariantId { get; set; }
    public string AttributeName { get; set; } = string.Empty; 
    public string AttributeValue { get; set; } = string.Empty; 

    public ProductVariant Variant { get; set; } = null!;
}