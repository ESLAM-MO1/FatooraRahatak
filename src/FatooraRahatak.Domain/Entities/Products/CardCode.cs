using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Products;

public class CardCode : BaseEntity
{
    public long ProductId { get; set; }
    public string Code { get; set; } = string.Empty;
    public bool IsUsed { get; set; }
    public long? UsedByOrderId { get; set; }
    public DateTime? UsedAt { get; set; }

    public Product Product { get; set; } = null!;
}
