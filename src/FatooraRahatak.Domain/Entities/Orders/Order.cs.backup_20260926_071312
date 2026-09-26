using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Entities.Shipping;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Orders;

public class Order : BaseEntity
{
    public string OrderNumber { get; set; } = string.Empty;
    public long StoreId { get; set; }
    public long? CustomerId { get; set; }
    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestEmail { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public OrderStatus Status { get; set; } = OrderStatus.New;
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;
    public decimal SubTotal { get; set; }
    public decimal DiscountAmount { get; set; } = 0;
    public decimal ShippingCost { get; set; } = 0;
    public decimal TotalAmount { get; set; }
    public long? CouponId { get; set; }
    public string? Notes { get; set; }
    public ShippingMethodType? ShippingMethodType { get; set; }
    public PaymentMethodType? PaymentMethodType { get; set; }
    public DateTime? SettledAt { get; set; }
    public long? SettlementBatchId { get; set; }
    public string? MarketingSource { get; set; }
    public string? MarketingCampaignName { get; set; }

    public Store Store { get; set; } = null!;
    public User? Customer { get; set; }
    public Coupon? Coupon { get; set; }
    public ICollection<OrderItem> Items { get; set; } = new List<OrderItem>();
    public ICollection<OrderStatusHistory> StatusHistory { get; set; } = new List<OrderStatusHistory>();
    public ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
    public Payment? Payment { get; set; }
}