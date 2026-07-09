using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Orders;

namespace FatooraRahatak.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Store> Stores => Set<Store>();

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
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<VariantAttribute> VariantAttributes => Set<VariantAttribute>();
    public DbSet<ProductImage> ProductImages => Set<ProductImage>();

    public DbSet<Warehouse> Warehouses => Set<Warehouse>();
    public DbSet<InventoryStock> InventoryStocks => Set<InventoryStock>();
    public DbSet<InventoryTransaction> InventoryTransactions => Set<InventoryTransaction>();
    public DbSet<StockTransfer> StockTransfers => Set<StockTransfer>();
    public DbSet<StockTransferItem> StockTransferItems => Set<StockTransferItem>();
    public DbSet<DamagedStock> DamagedStocks => Set<DamagedStock>();
    public DbSet<VerificationCode> VerificationCodes => Set<VerificationCode>();
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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<RolePermission>()
            .HasKey(rp => new { rp.RoleId, rp.PermissionId });

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Phone).IsUnique();

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

// --- تاسك 4 (معلم 2): نظام الطلبات ---

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
    .Property(o => o.TotalAmount).HasPrecision(10, 2);
modelBuilder.Entity<OrderItem>()
    .Property(i => i.UnitPriceSnapshot).HasPrecision(10, 2);
modelBuilder.Entity<OrderItem>()
    .Property(i => i.LineTotal).HasPrecision(10, 2);

    }
}