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
    public CustomDomainStatus CustomDomainStatus { get; set; } = CustomDomainStatus.None;
    public string? Logo { get; set; }
    public StoreStatus Status { get; set; } = StoreStatus.PendingApproval;
    public long PackageId { get; set; }
    public long? ActiveSubscriptionId { get; set; }
    public DateTime BillingCycleDate { get; set; }
    public string DefaultLanguage { get; set; } = "ar";
    public bool IsVatRegistered { get; set; } = false;
    public string? VatNumber { get; set; }
    public string? ReturnPolicyText { get; set; }
    public string? ContactPhone { get; set; }
    public string? ContactEmail { get; set; }
    public string? ContactAddress { get; set; }
    public string? BioLink { get; set; }
    public string? FacebookUrl { get; set; }
    public string? InstagramUrl { get; set; }
    public string? WhatsappUrl { get; set; }
    public string Currency { get; set; } = "SAR";
    public User Owner { get; set; } = null!;
    public Package Package { get; set; } = null!;
    public ICollection<Subscription> Subscriptions { get; set; } = new List<Subscription>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
    public ICollection<Category> Categories { get; set; } = new List<Category>();
    public ICollection<Product> Products { get; set; } = new List<Product>();
    public ICollection<Warehouse> Warehouses { get; set; } = new List<Warehouse>();
    public ICollection<Cart> Carts { get; set; } = new List<Cart>();
    public ICollection<Coupon> Coupons { get; set; } = new List<Coupon>();
    public bool IsSearchEnabled { get; set; } = true;
    public bool IsReviewsEnabled { get; set; } = false;
    public int? LowStockThreshold { get; set; }
    public bool IsCouponsEnabled { get; set; } = true;
    public bool CustomerNotificationEmail { get; set; } = false;
    public bool CustomerNotificationWhatsapp { get; set; } = false;
    public string? TrustBadgesJson { get; set; } // JSON array of { icon, text, isEnabled }
    public int? ReturnPolicyDays { get; set; }
    public bool IsOnline { get; set; } = true;
    public string ThemeName { get; set; } = "basic";
    public string PrimaryColor { get; set; } = "#12a8db";
    public string? CoverImage { get; set; }
}