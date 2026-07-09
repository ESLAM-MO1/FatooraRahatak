using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Orders;

public class OrderStatusHistory : BaseEntity
{
    public long OrderId { get; set; }
    public OrderStatus Status { get; set; }
    public long? ChangedByUserId { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public Order Order { get; set; } = null!;
    public User? ChangedBy { get; set; }
}