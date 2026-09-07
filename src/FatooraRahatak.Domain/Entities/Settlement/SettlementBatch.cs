using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Settlement;

public class SettlementBatch : BaseEntity
{
    public string BatchNumber { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public SettlementBatchStatus Status { get; set; } = SettlementBatchStatus.Pending;
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ShippingDeductedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public int OrdersCount { get; set; }
    public long? CompletedByUserId { get; set; }
    public DateTime? CompletedAt { get; set; }

    public ICollection<SettlementLine> Lines { get; set; } = new List<SettlementLine>();
}
