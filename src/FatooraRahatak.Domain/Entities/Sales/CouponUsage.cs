using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Sales;

public class CouponUsage : BaseEntity
{
    public long CouponId { get; set; }
    public long CartId { get; set; } 

    public Coupon Coupon { get; set; } = null!;
    public Cart Cart { get; set; } = null!;
}