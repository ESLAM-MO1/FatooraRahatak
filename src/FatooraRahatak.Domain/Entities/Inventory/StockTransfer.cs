using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class StockTransfer : BaseEntity
{
    public long FromWarehouseId { get; set; }
    public long ToWarehouseId { get; set; }
    public StockTransferStatus Status { get; set; } = StockTransferStatus.Pending;
    public long RequestedByUserId { get; set; }
    public long? ApprovedByUserId { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Warehouse FromWarehouse { get; set; } = null!;
    public Warehouse ToWarehouse { get; set; } = null!;
    public User RequestedBy { get; set; } = null!;
    public User? ApprovedBy { get; set; }
    public ICollection<StockTransferItem> Items { get; set; } = new List<StockTransferItem>();
}