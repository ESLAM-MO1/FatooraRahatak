namespace FatooraRahatak.Application.DTOs.Sales;

public class CartResponseDto
{
    public long Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public List<CartItemDto> Items { get; set; } = new();
    public decimal Subtotal { get; set; }
    public decimal TotalWeightKg { get; set; }
}

public class CartItemDto
{
    public long Id { get; set; }
    public long ProductId { get; set; }
    public string ProductNameAr { get; set; } = string.Empty;
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public decimal PriceAtAdd { get; set; }
    public decimal LineTotal { get; set; }
    public decimal? Weight { get; set; }
}