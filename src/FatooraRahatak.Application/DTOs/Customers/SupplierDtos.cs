namespace FatooraRahatak.Application.DTOs.Customers;

public class CreateSupplierDto
{
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Notes { get; set; }
}
