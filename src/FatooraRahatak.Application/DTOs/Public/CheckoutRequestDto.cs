namespace FatooraRahatak.Application.DTOs.Public;

public class CheckoutRequestDto
{

    public string SessionId { get; set; } = string.Empty;

    public string? GuestName { get; set; }
    public string? GuestPhone { get; set; }
    public string? GuestEmail { get; set; }
    public string ShippingAddress { get; set; } = string.Empty;
    public string? Notes { get; set; }
}