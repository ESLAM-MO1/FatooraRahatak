using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Sales;

public class Cart : BaseEntity
{
    public long StoreId { get; set; }
    public long? CustomerId { get; set; } 
    public string? SessionId { get; set; } 
    public CartStatus Status { get; set; } = CartStatus.Active;

    public Store Store { get; set; } = null!;
    public ICollection<CartItem> Items { get; set; } = new List<CartItem>();
}