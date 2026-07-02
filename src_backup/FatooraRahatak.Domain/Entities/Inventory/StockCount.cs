using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class StockCount : BaseEntity
{
    public long WarehouseId { get; set; }
    public StockCountStatus Status { get; set; } = StockCountStatus.InProgress;
    public long StartedByUserId { get; set; }
    public long? ApprovedByUserId { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Warehouse Warehouse { get; set; } = null!;
    public User StartedBy { get; set; } = null!;
    public User? ApprovedBy { get; set; }
    public ICollection<StockCountItem> Items { get; set; } = new List<StockCountItem>();
}