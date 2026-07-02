using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Sales;

public class CouponUsage : BaseEntity
{
    public long CouponId { get; set; }
    public long CartId { get; set; } // بنسجلها وقت التطبيق على الكارت (قبل ما تتحول لطلب فعلي في معلم 2)

    public Coupon Coupon { get; set; } = null!;
    public Cart Cart { get; set; } = null!;
}