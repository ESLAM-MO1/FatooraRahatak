using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Inventory;

public class DamagedStock : BaseEntity
{
    public long WarehouseId { get; set; }
    public long ProductId { get; set; }
    public long? VariantId { get; set; }
    public int Quantity { get; set; }
    public string Reason { get; set; } = string.Empty;
    public long ReportedByUserId { get; set; }
    public long? ApprovedByUserId { get; set; }
    public bool IsApproved { get; set; } = false;

    public Warehouse Warehouse { get; set; } = null!;
    public Product Product { get; set; } = null!;
    public ProductVariant? Variant { get; set; }
    public User ReportedBy { get; set; } = null!;
    public User? ApprovedBy { get; set; }
}