namespace FatooraRahatak.Application.DTOs.Customers;

public class OwnerCustomerDetailDto
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public bool IsGuest { get; set; }
    public int OrdersCount { get; set; }
    public decimal TotalSpent { get; set; }
    public List<OwnerCustomerOrderDto> Orders { get; set; } = new();
    public long? CustomerId { get; set; }
}

public class OwnerCustomerOrderDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ItemsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    
    
}