namespace FatooraRahatak.Application.DTOs.Customers;

public class StoreCustomerDto
{
    public long Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}