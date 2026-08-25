namespace FatooraRahatak.Application.DTOs.Customers;

public class CreateStoreCustomerDto
{
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Notes { get; set; }
    public string? VatNumber { get; set; }
    public string? Country { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Street { get; set; }
    public string? PostalCode { get; set; }
    public string? BuildingNumber { get; set; }
    public string? NationalAddress { get; set; }
}