using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Customers;

public class StoreCustomer : BaseEntity
{
    public long StoreId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Notes { get; set; }

    // البيانات الضريبية والعنوان الوطني
    public string? VatNumber { get; set; }
    public string? Country { get; set; }
    public string? Region { get; set; }
    public string? City { get; set; }
    public string? Street { get; set; }
    public string? PostalCode { get; set; }
    public string? BuildingNumber { get; set; }
    public string? NationalAddress { get; set; }

    public Store Store { get; set; } = null!;
}