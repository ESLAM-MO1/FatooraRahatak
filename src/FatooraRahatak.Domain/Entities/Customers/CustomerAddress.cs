using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Customers;

public class CustomerAddress : BaseEntity
{
    public long StoreId { get; set; }
    public string Phone { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string AddressLine { get; set; } = string.Empty;
    public string? Landmark { get; set; }
    public string? Notes { get; set; }
    public bool IsDefault { get; set; } = false;

    // العنوان الوطني الكامل: المنطقة، الحي، الشارع، رقم المبنى، الرمز البريدي
    public string? Region { get; set; }
    public string? District { get; set; }
    public string? Street { get; set; }
    public string? BuildingNumber { get; set; }
    public string? PostalCode { get; set; }
    public string? NationalAddress { get; set; }

    public Store Store { get; set; } = null!;
}
