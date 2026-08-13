using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Orders;

public class ReturnRequest : BaseEntity
{
    public long StoreId { get; set; }
    public long OrderId { get; set; }
    public long? CustomerId { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestName { get; set; }
    public string Reason { get; set; } = string.Empty;
    public ReturnRequestStatus Status { get; set; } = ReturnRequestStatus.Pending;
    public string? DecisionNote { get; set; }
    public long? DecidedByUserId { get; set; }
    public DateTime? DecidedAt { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? RefundStatus { get; set; }

    public Store Store { get; set; } = null!;
    public Order Order { get; set; } = null!;
    public User? Customer { get; set; }
    public User? DecidedBy { get; set; }
}
