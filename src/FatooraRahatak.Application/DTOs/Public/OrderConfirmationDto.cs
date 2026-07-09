namespace FatooraRahatak.Application.DTOs.Public;

public class OrderConfirmationDto
{
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
}