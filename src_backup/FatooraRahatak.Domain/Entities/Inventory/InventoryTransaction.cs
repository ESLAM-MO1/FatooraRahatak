using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class InventoryTransaction : BaseEntity
{
    public long WarehouseId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public InventoryTransactionType TransactionType { get; set; }
    public int Quantity { get; set; } // موجب أو سالب
    public string? ReferenceType { get; set; } // "Order" / "PurchaseInvoice" / "Transfer" / "InitialStock"
    public long? ReferenceId { get; set; }
    public long CreatedByUserId { get; set; }

    // Navigation Properties
    public Warehouse Warehouse { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
    public User CreatedBy { get; set; } = null!;
}