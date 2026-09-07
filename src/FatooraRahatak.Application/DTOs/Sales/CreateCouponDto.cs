namespace FatooraRahatak.Application.DTOs.Sales;

public class CreateCouponDto
{
    public string Code { get; set; } = string.Empty;
    public string DiscountType { get; set; } = string.Empty; 
    public decimal DiscountValue { get; set; }
    public int? UsageLimitTotal { get; set; }
    public int UsageLimitPerCustomer { get; set; } = 1;
    public decimal MinOrderAmount { get; set; } = 0;
    public DateTime ValidFrom { get; set; }
    public DateTime ValidUntil { get; set; }
}