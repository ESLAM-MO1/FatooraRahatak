namespace FatooraRahatak.Application.DTOs.Orders;

public class RequestReturnDto
{
    public long OrderId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? GuestPhone { get; set; }
}

public class HandleReturnRequestDto
{
    public bool Approve { get; set; }
    public string? Note { get; set; }
}

public class ReturnRequestDto
{
    public long Id { get; set; }
    public long OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerName { get; set; }
    public string? GuestPhone { get; set; }
    public decimal OrderTotal { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? DecisionNote { get; set; }
    public decimal? RefundAmount { get; set; }
    public string? RefundStatus { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? DecidedAt { get; set; }
}
