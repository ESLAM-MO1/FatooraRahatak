using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Affiliates;
using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Customers;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Notifications;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Audit;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Platform.Domains;
using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Shipping;
using FatooraRahatak.Domain.Entities.Settlement;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Store> Stores => Set<Store>();
    public DbSet<StoreShippingMethod> StoreShippingMethods => Set<StoreShippingMethod>();
    public DbSet<StorePaymentMethod> StorePaymentMethods => Set<StorePaymentMethod>();

    public DbSet<Package> Packages => Set<Package>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<EmployeePermissionOverride> EmployeePermissionOverrides => Set<EmployeePermissionOverride>();

    public DbSet<Employee> Employees => Set<Employee>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<VariantAttribute> VariantAttributes => Set<VariantAttribute>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryStock> InventoryStocks => Set<InventoryStock>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    public DbSet<DamagedStock> DamagedStocks => Set<DamagedStock>();
    public DbSet<VerificationCode> VerificationCodes => Set<VerificationCode>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<StockCount> StockCounts => Set<StockCount>();
    public DbSet<StockCountItem> StockCountItems => Set<StockCountItem>();
    public DbSet<Attendance> Attendances => Set<Attendance>();
    public DbSet<LeaveRequest> LeaveRequests => Set<LeaveRequest>();
    public DbSet<Payroll> Payrolls => Set<Payroll>();
    public DbSet<Cart> Carts => Set<Cart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Coupon> Coupons => Set<Coupon>();
    public DbSet<CouponUsage> CouponUsages => Set<CouponUsage>();
    public DbSet<PlatformSetting> PlatformSettings => Set<PlatformSetting>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<ReturnRequest> ReturnRequests => Set<ReturnRequest>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<JournalEntry> JournalEntries => Set<JournalEntry>();
    public DbSet<JournalEntryLine> JournalEntryLines => Set<JournalEntryLine>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Voucher> Vouchers => Set<Voucher>();
    public DbSet<FixedAsset> FixedAssets => Set<FixedAsset>();
    public DbSet<DepreciationEntry> DepreciationEntries => Set<DepreciationEntry>();
    public DbSet<StoreInvitation> StoreInvitations => Set<StoreInvitation>();
    public DbSet<PosShift> PosShifts => Set<PosShift>();
    public DbSet<SitePage> SitePages => Set<SitePage>();
    public DbSet<SiteFaqItem> SiteFaqItems => Set<SiteFaqItem>();
    public DbSet<SiteMenu> SiteMenus => Set<SiteMenu>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<TicketReply> TicketReplies => Set<TicketReply>();
    public DbSet<BlogPost> BlogPosts => Set<BlogPost>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<ManagedDomain> ManagedDomains => Set<ManagedDomain>();
    public DbSet<SslCertificate> SslCertificates => Set<SslCertificate>();
    public DbSet<DnsRecord> DnsRecords => Set<DnsRecord>();
    public DbSet<RedirectRule> RedirectRules => Set<RedirectRule>();
    public DbSet<ProfessionalEmailSetup> ProfessionalEmailSetups => Set<ProfessionalEmailSetup>();
    public DbSet<DomainRegistrationRequest> DomainRegistrationRequests => Set<DomainRegistrationRequest>();
    public DbSet<DomainBlacklistEntry> DomainBlacklistEntries => Set<DomainBlacklistEntry>();
    public DbSet<Theme> Themes => Set<Theme>();
    public DbSet<ReferralCode> ReferralCodes => Set<ReferralCode>();
    public DbSet<Referral> Referrals => Set<Referral>();
    public DbSet<AffiliateCommission> AffiliateCommissions => Set<AffiliateCommission>();
    public DbSet<ShippingCompany> ShippingCompanies => Set<ShippingCompany>();
    public DbSet<Shipment> Shipments => Set<Shipment>();
    public DbSet<ShipmentEvent> ShipmentEvents => Set<ShipmentEvent>();
    public DbSet<StoreApiKey> StoreApiKeys => Set<StoreApiKey>();
    public DbSet<MerchantBankDetails> MerchantBankDetails => Set<MerchantBankDetails>();
    public DbSet<SettlementBatch> SettlementBatches => Set<SettlementBatch>();
    public DbSet<SettlementLine> SettlementLines => Set<SettlementLine>();
    public DbSet<ZatcaCredential> ZatcaCredentials => Set<ZatcaCredential>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Phone).IsUnique();
        modelBuilder.Entity<User>()
            .Property(u => u.AffiliateBalance).HasPrecision(14, 2);

        modelBuilder.Entity<Store>()
            .HasIndex(s => s.StoreSlug).IsUnique();

        modelBuilder.Entity<Permission>()
            .HasIndex(p => p.PermissionCode).IsUnique();

        modelBuilder.Entity<Store>()
            .HasOne(s => s.Owner)
            .WithOne(u => u.OwnedStore)
            .HasForeignKey<Store>(s => s.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.User)
            .WithOne(u => u.EmployeeProfile)
            .HasForeignKey<Employee>(e => e.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Store)
            .WithMany(s => s.Employees)
            .HasForeignKey(e => e.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Employee>()
            .HasOne(e => e.Role)
            .WithMany(r => r.Employees)
            .HasForeignKey(e => e.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StoreInvitation>()
            .HasOne(i => i.Store)
            .WithMany()
            .HasForeignKey(i => i.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoreInvitation>()
            .HasIndex(i => i.Token)
            .IsUnique();

        modelBuilder.Entity<StoreInvitation>()
            .HasIndex(i => new { i.StoreId, i.Email });

        modelBuilder.Entity<Subscription>()
            .HasOne(s => s.Store)
            .WithMany(st => st.Subscriptions)
            .HasForeignKey(s => s.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Subscription>()
            .HasOne(s => s.Package)
            .WithMany(p => p.Subscriptions)
            .HasForeignKey(s => s.PackageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Store>()
            .HasOne(s => s.Package)
            .WithMany(p => p.Stores)
            .HasForeignKey(s => s.PackageId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CustomerAddress>()
            .HasOne(a => a.Store)
            .WithMany()
            .HasForeignKey(a => a.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CustomerAddress>()
            .HasIndex(a => new { a.StoreId, a.Phone });

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Role)
            .WithMany(r => r.RolePermissions)
            .HasForeignKey(rp => rp.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<RolePermission>()
            .HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EmployeePermissionOverride>()
            .HasOne(e => e.Employee)
            .WithMany(emp => emp.PermissionOverrides)
            .HasForeignKey(e => e.EmployeeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<EmployeePermissionOverride>()
            .HasOne(e => e.Permission)
            .WithMany(p => p.EmployeeOverrides)
            .HasForeignKey(e => e.PermissionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Package>()
            .Property(p => p.MonthlyPrice)
            .HasPrecision(10, 2);

        modelBuilder.Entity<Package>()
            .Property(p => p.CommissionPercentage)
            .HasPrecision(5, 2);

        modelBuilder.Entity<Employee>()
            .Property(e => e.Salary)
            .HasPrecision(10, 2);

        modelBuilder.Entity<RefreshToken>()
            .HasOne(rt => rt.User)
            .WithMany(u => u.RefreshTokens)
            .HasForeignKey(rt => rt.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RefreshToken>()
            .HasIndex(rt => rt.Token)
            .IsUnique();

        modelBuilder.Entity<Category>()
            .HasOne(c => c.ParentCategory)
            .WithMany(c => c.SubCategories)
            .HasForeignKey(c => c.ParentCategoryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Category>()
            .HasOne(c => c.Store)
            .WithMany(s => s.Categories)
            .HasForeignKey(c => c.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Product>()
            .HasOne(p => p.Store)
            .WithMany(s => s.Products)
            .HasForeignKey(p => p.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<ProductVariant>()
            .HasOne(v => v.Product)
            .WithMany(p => p.Variants)
            .HasForeignKey(v => v.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VariantAttribute>()
            .HasOne(a => a.Variant)
            .WithMany(v => v.Attributes)
            .HasForeignKey(a => a.VariantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductImage>()
            .HasOne(i => i.Product)
            .WithMany(p => p.Images)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductReview>()
            .HasIndex(r => new { r.StoreId, r.ProductId });

        modelBuilder.Entity<Product>()
            .HasIndex(p => new { p.StoreId, p.Sku })
            .IsUnique();

        modelBuilder.Entity<ProductVariant>()
            .HasIndex(v => v.Sku)
            .IsUnique();

        modelBuilder.Entity<Product>()
            .Property(p => p.BasePrice).HasPrecision(10, 2);
        modelBuilder.Entity<Product>()
            .Property(p => p.DiscountPrice).HasPrecision(10, 2);
        modelBuilder.Entity<Product>()
            .Property(p => p.CostPrice).HasPrecision(10, 2);
        modelBuilder.Entity<Product>()
            .Property(p => p.Weight).HasPrecision(10, 3);
        modelBuilder.Entity<ProductVariant>()
            .Property(v => v.PriceAdjustment).HasPrecision(10, 2);

        modelBuilder.Entity<Warehouse>()
            .HasOne(w => w.Store)
            .WithMany(s => s.Warehouses)
            .HasForeignKey(w => w.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryStock>()
            .HasOne(i => i.Warehouse)
            .WithMany(w => w.StockItems)
            .HasForeignKey(i => i.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryStock>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryStock>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(t => t.Warehouse)
            .WithMany()
            .HasForeignKey(t => t.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(t => t.Product)
            .WithMany()
            .HasForeignKey(t => t.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(t => t.Variant)
            .WithMany()
            .HasForeignKey(t => t.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryTransaction>()
            .HasOne(t => t.CreatedBy)
            .WithMany()
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.FromWarehouse)
            .WithMany()
            .HasForeignKey(t => t.FromWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.ToWarehouse)
            .WithMany()
            .HasForeignKey(t => t.ToWarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.RequestedBy)
            .WithMany()
            .HasForeignKey(t => t.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransfer>()
            .HasOne(t => t.ApprovedBy)
            .WithMany()
            .HasForeignKey(t => t.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransferItem>()
            .HasOne(i => i.Transfer)
            .WithMany(t => t.Items)
            .HasForeignKey(i => i.TransferId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockTransferItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockTransferItem>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DamagedStock>()
            .HasOne(d => d.Warehouse)
            .WithMany()
            .HasForeignKey(d => d.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DamagedStock>()
            .HasOne(d => d.Product)
            .WithMany()
            .HasForeignKey(d => d.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DamagedStock>()
            .HasOne(d => d.Variant)
            .WithMany()
            .HasForeignKey(d => d.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DamagedStock>()
            .HasOne(d => d.ReportedBy)
            .WithMany()
            .HasForeignKey(d => d.ReportedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DamagedStock>()
            .HasOne(d => d.ApprovedBy)
            .WithMany()
            .HasForeignKey(d => d.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InventoryStock>()
            .HasIndex(i => new { i.WarehouseId, i.ProductId, i.VariantId })
            .IsUnique();
        modelBuilder.Entity<VerificationCode>()
            .HasOne(v => v.User)
            .WithMany(u => u.VerificationCodes)
            .HasForeignKey(v => v.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StockCount>()
            .HasOne(s => s.Warehouse)
            .WithMany()
            .HasForeignKey(s => s.WarehouseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockCount>()
            .HasOne(s => s.StartedBy)
            .WithMany()
            .HasForeignKey(s => s.StartedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockCount>()
            .HasOne(s => s.ApprovedBy)
            .WithMany()
            .HasForeignKey(s => s.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockCountItem>()
            .HasOne(i => i.StockCount)
            .WithMany(s => s.Items)
            .HasForeignKey(i => i.StockCountId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockCountItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockCountItem>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Attendance>()
            .HasOne(a => a.Employee)
            .WithMany(e => e.AttendanceRecords)
            .HasForeignKey(a => a.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Attendance>()
            .HasIndex(a => new { a.EmployeeId, a.Date })
            .IsUnique();

        modelBuilder.Entity<LeaveRequest>()
            .HasOne(l => l.Employee)
            .WithMany(e => e.LeaveRequests)
            .HasForeignKey(l => l.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<LeaveRequest>()
            .HasOne(l => l.ApprovedBy)
            .WithMany()
            .HasForeignKey(l => l.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<Payroll>()
            .HasOne(p => p.Employee)
            .WithMany(e => e.PayrollRecords)
            .HasForeignKey(p => p.EmployeeId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Payroll>()
            .HasOne(p => p.ApprovedBy)
            .WithMany()
            .HasForeignKey(p => p.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payroll>()
            .HasIndex(p => new { p.EmployeeId, p.PeriodMonth })
            .IsUnique();

        modelBuilder.Entity<Payroll>()
            .Property(p => p.BasicSalary).HasPrecision(10, 2);
        modelBuilder.Entity<Payroll>()
            .Property(p => p.Allowances).HasPrecision(10, 2);
        modelBuilder.Entity<Payroll>()
            .Property(p => p.Deductions).HasPrecision(10, 2);
        modelBuilder.Entity<Payroll>()
            .Property(p => p.Commission).HasPrecision(10, 2);
        modelBuilder.Entity<Payroll>()
            .Property(p => p.NetSalary).HasPrecision(10, 2);
        modelBuilder.Entity<Cart>()
            .HasOne(c => c.Store)
            .WithMany(s => s.Carts)
            .HasForeignKey(c => c.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CartItem>()
            .HasOne(i => i.Cart)
            .WithMany(c => c.Items)
            .HasForeignKey(i => i.CartId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CartItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CartItem>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Coupon>()
            .HasOne(c => c.Store)
            .WithMany(s => s.Coupons)
            .HasForeignKey(c => c.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Coupon>()
            .HasIndex(c => new { c.StoreId, c.Code })
            .IsUnique();

        modelBuilder.Entity<CouponUsage>()
            .HasOne(u => u.Coupon)
            .WithMany(c => c.Usages)
            .HasForeignKey(u => u.CouponId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CouponUsage>()
            .HasOne(u => u.Cart)
            .WithMany()
            .HasForeignKey(u => u.CartId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<CartItem>()
            .Property(i => i.PriceAtAdd).HasPrecision(10, 2);
        modelBuilder.Entity<Coupon>()
            .Property(c => c.DiscountValue).HasPrecision(10, 2);
        modelBuilder.Entity<Coupon>()
            .Property(c => c.MinOrderAmount).HasPrecision(10, 2);
        modelBuilder.Entity<PlatformSetting>()
            .HasIndex(p => p.SettingKey)
            .IsUnique();

        modelBuilder.Entity<SitePage>()
            .HasIndex(p => p.PageKey)
            .IsUnique();

        modelBuilder.Entity<SiteMenu>()
            .HasOne(m => m.Parent)
            .WithMany()
            .HasForeignKey(m => m.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BlogPost>()
            .HasIndex(p => p.SlugAr)
            .IsUnique();

        modelBuilder.Entity<TicketReply>()
            .HasOne(r => r.Ticket)
            .WithMany(t => t.TicketReplies)
            .HasForeignKey(r => r.TicketId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ContactMessage>()
            .HasOne(m => m.User)
            .WithMany()
            .HasForeignKey(m => m.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Order>()
            .HasIndex(o => o.OrderNumber)
            .IsUnique();

        modelBuilder.Entity<Order>()
            .HasOne(o => o.Store)
            .WithMany()
            .HasForeignKey(o => o.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.Customer)
            .WithMany()
            .HasForeignKey(o => o.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.Coupon)
            .WithMany()
            .HasForeignKey(o => o.CouponId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrderItem>()
            .HasOne(i => i.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(i => i.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrderItem>()
            .HasOne(i => i.Product)
            .WithMany()
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrderItem>()
            .HasOne(i => i.Variant)
            .WithMany()
            .HasForeignKey(i => i.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OrderStatusHistory>()
            .HasOne(h => h.Order)
            .WithMany(o => o.StatusHistory)
            .HasForeignKey(h => h.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OrderStatusHistory>()
            .HasOne(h => h.ChangedBy)
            .WithMany()
            .HasForeignKey(h => h.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .Property(o => o.SubTotal).HasPrecision(10, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.DiscountAmount).HasPrecision(10, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.ShippingCost).HasPrecision(10, 2);
        modelBuilder.Entity<Order>()
            .Property(o => o.TotalAmount).HasPrecision(10, 2);
        modelBuilder.Entity<OrderItem>()
            .Property(i => i.UnitPriceSnapshot).HasPrecision(10, 2);
        modelBuilder.Entity<OrderItem>()
            .Property(i => i.LineTotal).HasPrecision(10, 2);

        modelBuilder.Entity<Notification>()
            .HasOne(n => n.User)
            .WithMany()
            .HasForeignKey(n => n.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Notification>()
            .HasIndex(n => new { n.UserId, n.IsRead });


        modelBuilder.Entity<Account>()
            .HasOne(a => a.Store)
            .WithMany()
            .HasForeignKey(a => a.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Account>()
            .HasOne(a => a.ParentAccount)
            .WithMany(a => a.SubAccounts)
            .HasForeignKey(a => a.ParentAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Account>()
            .HasIndex(a => new { a.StoreId, a.Code })
            .IsUnique();

        modelBuilder.Entity<JournalEntry>()
            .HasOne(e => e.Store)
            .WithMany()
            .HasForeignKey(e => e.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JournalEntry>()
            .HasOne(e => e.CreatedBy)
            .WithMany()
            .HasForeignKey(e => e.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JournalEntry>()
            .HasOne(e => e.ApprovedBy)
            .WithMany()
            .HasForeignKey(e => e.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JournalEntry>()
            .HasOne(e => e.ReversalOfEntry)
            .WithMany()
            .HasForeignKey(e => e.ReversalOfEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JournalEntry>()
            .HasIndex(e => new { e.StoreId, e.EntryNumber })
            .IsUnique();

        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(l => l.JournalEntry)
            .WithMany(e => e.Lines)
            .HasForeignKey(l => l.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<JournalEntryLine>()
            .HasOne(l => l.Account)
            .WithMany()
            .HasForeignKey(l => l.AccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<JournalEntryLine>()
            .Property(l => l.Debit).HasPrecision(14, 2);
        modelBuilder.Entity<JournalEntryLine>()
            .Property(l => l.Credit).HasPrecision(14, 2);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Store)
            .WithMany()
            .HasForeignKey(i => i.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Customer)
            .WithMany()
            .HasForeignKey(i => i.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.CreatedBy)
            .WithMany()
            .HasForeignKey(i => i.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.JournalEntry)
            .WithMany()
            .HasForeignKey(i => i.JournalEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>()
            .HasIndex(i => new { i.StoreId, i.InvoiceNumber })
            .IsUnique();

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(it => it.Invoice)
            .WithMany(i => i.Items)
            .HasForeignKey(it => it.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(it => it.Product)
            .WithMany()
            .HasForeignKey(it => it.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(it => it.Variant)
            .WithMany()
            .HasForeignKey(it => it.VariantId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Invoice>()
            .Property(i => i.SubTotal).HasPrecision(14, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.DiscountAmount).HasPrecision(14, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.TaxAmount).HasPrecision(14, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.TotalAmount).HasPrecision(14, 2);
        modelBuilder.Entity<Invoice>()
            .Property(i => i.CostOfGoodsSold).HasPrecision(14, 2);
        modelBuilder.Entity<InvoiceItem>()
            .Property(it => it.UnitPrice).HasPrecision(14, 2);
        modelBuilder.Entity<InvoiceItem>()
            .Property(it => it.LineTotal).HasPrecision(14, 2);
        modelBuilder.Entity<InvoiceItem>()
            .Property(it => it.DiscountAmount).HasPrecision(14, 2);
        modelBuilder.Entity<InvoiceItem>()
            .Property(it => it.LineAfterDiscount).HasPrecision(14, 2);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Invoice)
            .WithOne(i => i.Payment)
            .HasForeignKey<Payment>(p => p.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Order)
            .WithOne(o => o.Payment)
            .HasForeignKey<Payment>(p => p.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .HasOne(p => p.Subscription)
            .WithOne(s => s.Payment)
            .HasForeignKey<Payment>(p => p.SubscriptionId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Payment>()
            .Property(p => p.Amount)
            .HasPrecision(14, 2);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.Store)
            .WithMany()
            .HasForeignKey(v => v.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.CounterpartAccount)
            .WithMany()
            .HasForeignKey(v => v.CounterpartAccountId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.Customer)
            .WithMany()
            .HasForeignKey(v => v.CustomerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.CreatedBy)
            .WithMany()
            .HasForeignKey(v => v.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasOne(v => v.JournalEntry)
            .WithMany()
            .HasForeignKey(v => v.JournalEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Voucher>()
            .HasIndex(v => new { v.StoreId, v.VoucherNumber })
            .IsUnique();

        modelBuilder.Entity<Voucher>()
            .Property(v => v.Amount).HasPrecision(14, 2);

        modelBuilder.Entity<FixedAsset>()
            .HasOne(a => a.Store)
            .WithMany()
            .HasForeignKey(a => a.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<FixedAsset>()
            .HasOne(a => a.CreatedBy)
            .WithMany()
            .HasForeignKey(a => a.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DepreciationEntry>()
            .HasOne(d => d.FixedAsset)
            .WithMany(a => a.DepreciationEntries)
            .HasForeignKey(d => d.FixedAssetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DepreciationEntry>()
            .HasOne(d => d.JournalEntry)
            .WithMany()
            .HasForeignKey(d => d.JournalEntryId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DepreciationEntry>()
            .HasOne(d => d.CreatedBy)
            .WithMany()
            .HasForeignKey(d => d.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<DepreciationEntry>()
            .HasIndex(d => new { d.FixedAssetId, d.PeriodMonth })
            .IsUnique();

        modelBuilder.Entity<FixedAsset>()
            .Property(a => a.PurchaseCost).HasPrecision(14, 2);
        modelBuilder.Entity<FixedAsset>()
            .Property(a => a.AccumulatedDepreciation).HasPrecision(14, 2);
        modelBuilder.Entity<DepreciationEntry>()
            .Property(d => d.Amount).HasPrecision(14, 2);

        modelBuilder.Entity<Payroll>()
            .HasOne(p => p.JournalEntry)
            .WithMany()
            .HasForeignKey(p => p.JournalEntryId)
            .OnDelete(DeleteBehavior.Restrict);
        modelBuilder.Entity<StoreShippingMethod>()
            .HasOne(m => m.Store)
            .WithMany()
            .HasForeignKey(m => m.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StoreShippingMethod>()
            .HasIndex(m => new { m.StoreId, m.Type })
            .IsUnique();

        modelBuilder.Entity<StorePaymentMethod>()
            .HasOne(m => m.Store)
            .WithMany()
            .HasForeignKey(m => m.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StorePaymentMethod>()
            .HasIndex(m => new { m.StoreId, m.Type })
            .IsUnique();

        modelBuilder.Entity<PosShift>()
            .HasOne(s => s.Store)
            .WithMany()
            .HasForeignKey(s => s.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PosShift>()
            .HasOne(s => s.OpenedBy)
            .WithMany()
            .HasForeignKey(s => s.OpenedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<PosShift>()
            .Property(s => s.StartingCash).HasPrecision(14, 2);

        modelBuilder.Entity<PosShift>()
            .Property(s => s.EndingCash).HasPrecision(14, 2);

        modelBuilder.Entity<PosShift>()
            .Property(s => s.TotalSales).HasPrecision(14, 2);

        modelBuilder.Entity<Theme>()
            .HasIndex(t => t.ThemeKey)
            .IsUnique();

        modelBuilder.Entity<ReferralCode>()
            .HasIndex(r => r.Code)
            .IsUnique();

        modelBuilder.Entity<ReferralCode>()
            .HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Referral>()
            .HasOne(r => r.ReferrerUser)
            .WithMany()
            .HasForeignKey(r => r.ReferrerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Referral>()
            .HasOne(r => r.ReferredUser)
            .WithMany()
            .HasForeignKey(r => r.ReferredUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Referral>()
            .HasOne(r => r.ReferralCode)
            .WithMany(c => c.Referrals)
            .HasForeignKey(r => r.ReferralCodeId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AffiliateCommission>()
            .HasOne(c => c.Referral)
            .WithMany(r => r.Commissions)
            .HasForeignKey(c => c.ReferralId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AffiliateCommission>()
            .Property(c => c.Amount).HasPrecision(14, 2);
        modelBuilder.Entity<AffiliateCommission>()
            .Property(c => c.Rate).HasPrecision(5, 2);

        modelBuilder.Entity<ShippingCompany>()
            .HasIndex(c => new { c.StoreId, c.Code })
            .IsUnique();

        modelBuilder.Entity<Shipment>()
            .HasOne(s => s.ShippingCompany)
            .WithMany(c => c.Shipments)
            .HasForeignKey(s => s.ShippingCompanyId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<StoreApiKey>()
            .HasOne(k => k.Store)
            .WithMany()
            .HasForeignKey(k => k.StoreId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<StoreApiKey>()
            .HasIndex(k => k.PublicKey).IsUnique();
        modelBuilder.Entity<StoreApiKey>()
            .HasIndex(k => k.SecretKey).IsUnique();

        modelBuilder.Entity<Shipment>()
            .HasIndex(s => s.Awb);

        modelBuilder.Entity<Shipment>()
            .Property(s => s.ShippingCost).HasPrecision(14, 2);
        modelBuilder.Entity<Shipment>()
            .Property(s => s.Weight).HasPrecision(10, 3);
        modelBuilder.Entity<Shipment>()
            .Property(s => s.CodAmount).HasPrecision(14, 2);

        modelBuilder.Entity<ShipmentEvent>()
            .HasOne(e => e.Shipment)
            .WithMany(s => s.Events)
            .HasForeignKey(e => e.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MerchantBankDetails>()
            .HasOne(m => m.Store)
            .WithMany()
            .HasForeignKey(m => m.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MerchantBankDetails>()
            .HasIndex(m => m.StoreId)
            .IsUnique();

        modelBuilder.Entity<MerchantBankDetails>()
            .Property(m => m.Iban).HasMaxLength(34);

        modelBuilder.Entity<SettlementBatch>()
            .HasIndex(b => b.BatchNumber)
            .IsUnique();

        modelBuilder.Entity<SettlementBatch>()
            .Property(b => b.GrossAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementBatch>()
            .Property(b => b.CommissionAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementBatch>()
            .Property(b => b.ShippingDeductedAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementBatch>()
            .Property(b => b.NetAmount).HasPrecision(14, 2);

        modelBuilder.Entity<SettlementLine>()
            .HasOne(l => l.SettlementBatch)
            .WithMany(b => b.Lines)
            .HasForeignKey(l => l.SettlementBatchId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SettlementLine>()
            .HasOne(l => l.Store)
            .WithMany()
            .HasForeignKey(l => l.StoreId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SettlementLine>()
            .HasIndex(l => new { l.SettlementBatchId, l.StoreId })
            .IsUnique();

        modelBuilder.Entity<SettlementLine>()
            .Property(l => l.GrossAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementLine>()
            .Property(l => l.CommissionAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementLine>()
            .Property(l => l.ShippingDeductedAmount).HasPrecision(14, 2);
        modelBuilder.Entity<SettlementLine>()
            .Property(l => l.NetAmount).HasPrecision(14, 2);

        modelBuilder.Entity<Order>()
            .HasIndex(o => new { o.StoreId, o.SettledAt });

        modelBuilder.Entity<ZatcaCredential>()
            .HasOne(z => z.Store)
            .WithMany()
            .HasForeignKey(z => z.StoreId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ZatcaCredential>()
            .HasIndex(z => z.StoreId)
            .IsUnique();

        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.VatNumber).HasMaxLength(32);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ComplianceRequestId).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ComplianceRequestSecret).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ProductionCsid).HasMaxLength(4096);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ProductionUuid).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ComplianceUuid).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.CsidPrivateKey).HasMaxLength(4096);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.CsidCertificate).HasMaxLength(4096);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.CsidSecret).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.SolutionName).HasMaxLength(256);
        modelBuilder.Entity<ZatcaCredential>()
            .Property(z => z.ErrorMessage).HasMaxLength(2000);
    }
    public override int SaveChanges()
    {
        return base.SaveChanges();
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await base.SaveChangesAsync(cancellationToken);
    }
}