using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Customers;

public class Supplier : BaseEntity
{
    public long StoreId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? City { get; set; }
    public string? Notes { get; set; }

    public Store Store { get; set; } = null!;
}
