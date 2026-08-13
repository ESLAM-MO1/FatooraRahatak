using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Settlement;

public class SettlementLine : BaseEntity
{
    public long SettlementBatchId { get; set; }
    public long StoreId { get; set; }
    public decimal GrossAmount { get; set; }
    public decimal CommissionAmount { get; set; }
    public decimal ShippingDeductedAmount { get; set; }
    public decimal NetAmount { get; set; }
    public int OrdersCount { get; set; }
    public SettlementLineStatus Status { get; set; } = SettlementLineStatus.Pending;
    public string? PaymentReference { get; set; }
    public DateTime? PaidAt { get; set; }

    public SettlementBatch SettlementBatch { get; set; } = null!;
    public Store Store { get; set; } = null!;
}
