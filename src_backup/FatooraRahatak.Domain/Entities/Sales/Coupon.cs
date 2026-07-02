using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Sales;

public class Coupon : BaseEntity
{
    public long StoreId { get; set; }
    public string Code { get; set; } = string.Empty;
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
    public int? UsageLimitTotal { get; set; } // NULL = غير محدود
    public int UsageLimitPerCustomer { get; set; } = 1;
    public decimal MinOrderAmount { get; set; } = 0;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidUntil { get; set; }
    public bool IsActive { get; set; } = true;

    public Store Store { get; set; } = null!;
    public ICollection<CouponUsage> Usages { get; set; } = new List<CouponUsage>();
}