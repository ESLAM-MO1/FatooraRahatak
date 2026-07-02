using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Sales;
namespace FatooraRahatak.Domain.Entities.Stores;

public class Store : BaseEntity
{
    public long OwnerUserId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string? CustomDomain { get; set; }
    public string? Logo { get; set; }
    public StoreStatus Status { get; set; } = StoreStatus.PendingApproval;
    public long PackageId { get; set; }
    public long? ActiveSubscriptionId { get; set; }
    public DateTime BillingCycleDate { get; set; }
    public string DefaultLanguage { get; set; } = "ar";
    public bool IsVatRegistered { get; set; } = false;
    public string? VatNumber { get; set; }

    // Navigation Properties
    public User Owner { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<Cart> Carts { get; set; } = new List<Cart>();
    public ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
}