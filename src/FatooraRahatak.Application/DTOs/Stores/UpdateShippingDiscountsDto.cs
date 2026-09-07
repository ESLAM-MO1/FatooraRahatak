namespace FatooraRahatak.Application.DTOs.Stores;

public class UpdateShippingDiscountsDto
{
    public decimal? FreeShippingThreshold { get; set; }
    public decimal? ShippingDiscountPercent { get; set; }
}
