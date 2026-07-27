namespace FatooraRahatak.Application.DTOs.Payment;

public class CreatePaymentDto
{
    public string? InvoiceId { get; set; }
    public string? OrderId { get; set; }
    public string? SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Description { get; set; } = string.Empty;
    public string? CallbackUrl { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerPhone { get; set; }
}