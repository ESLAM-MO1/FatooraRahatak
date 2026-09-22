namespace FatooraRahatak.Application.DTOs.Admin;

public class ManualRefundDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string StoreName { get; set; } = string.Empty;
    public decimal? RefundAmount { get; set; }
    public string? RefundStatus { get; set; }
    public DateTime? DecidedAt { get; set; }
    public DateTime? ManualRefundConfirmedAt { get; set; }
    public string? ManualRefundConfirmedByName { get; set; }
}
