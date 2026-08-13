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

    public Store Store { get; set; } = null!;
}
