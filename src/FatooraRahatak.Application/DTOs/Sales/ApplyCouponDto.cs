namespace FatooraRahatak.Application.DTOs.Sales;

public class ApplyCouponDto
{
    public long CartId { get; set; }
    public string Code { get; set; } = string.Empty;
}