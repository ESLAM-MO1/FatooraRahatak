namespace FatooraRahatak.Application.DTOs.Public;

public class CustomerAddressDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? Landmark { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; }
}

public class SaveCustomerAddressDto
{
    public string FullName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? Landmark { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; } = false;
}

public class CustomerOrderListItemDto
{
    public long Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool CanCancel { get; set; }
}
