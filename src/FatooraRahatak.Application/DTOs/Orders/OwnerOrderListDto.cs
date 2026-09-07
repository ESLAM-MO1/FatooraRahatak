namespace FatooraRahatak.Application.DTOs.Orders;

public class OwnerOrderListDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public DateTime CreatedAt { get; set; }
}