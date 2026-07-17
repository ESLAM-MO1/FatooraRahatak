using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;
namespace FatooraRahatak.Domain.Entities.Accounting;

public class PosShift : BaseEntity
{
    public long StoreId { get; set; }
    public long OpenedByUserId { get; set; }
    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;
    public long? ClosedByUserId { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal StartingCash { get; set; }
    public decimal? EndingCash { get; set; }
    public decimal TotalSales { get; set; }
    public bool IsOpen => ClosedAt == null;

    public Store Store { get; set; } = null!;
    public User OpenedBy { get; set; } = null!;
}
