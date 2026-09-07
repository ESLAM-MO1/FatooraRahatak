namespace FatooraRahatak.Application.DTOs.Sales;

public class AddToCartDto
{
    public string? SessionId { get; set; } 
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; } = 1;
}