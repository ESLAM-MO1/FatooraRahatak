namespace FatooraRahatak.Application.DTOs.Customers;

public class OwnerCustomerListDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public int OrdersCount { get; set; }
    public decimal TotalSpent { get; set; }
    public DateTime LastOrderDate { get; set; }
    public bool IsGuest { get; set; }
    public long? CustomerId { get; set; }
    
}