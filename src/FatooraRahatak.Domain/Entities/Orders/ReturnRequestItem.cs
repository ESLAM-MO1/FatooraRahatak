using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Orders;

public class ReturnRequestItem : BaseEntity
{
    public long ReturnRequestId { get; set; }
    public long OrderItemId { get; set; }
    public int Quantity { get; set; }
    public decimal RefundAmount { get; set; }

    public ReturnRequest ReturnRequest { get; set; } = null!;
    public OrderItem OrderItem { get; set; } = null!;
}
