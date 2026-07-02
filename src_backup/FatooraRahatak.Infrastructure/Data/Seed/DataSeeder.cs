using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Data.Seed;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await SeedRolesAndPermissionsAsync(context);
        await SeedPackagesAsync(context);
    }

    private static async Task SeedRolesAndPermissionsAsync(AppDbContext context)
    {
        if (await context.Permissions.AnyAsync()) return; // اتعمل قبل كده، متكررش

        // ============ 1. تعريف الموديولات وعملياتها (مطابق للمصفوفة بالضبط) ============
        var moduleActions = new Dictionary<string, PermissionAction[]>
        {
            // Platform Level
            ["StoreManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["PackageManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformUserManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformFinancialReports"] = new[] { PermissionAction.View },
            ["PlatformSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["AuditLog"] = new[] { PermissionAction.View },

            // Store General
            ["StoreSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["EmployeeManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["SubscriptionPackage"] = new[] { PermissionAction.View, PermissionAction.Edit },

            // Products & Inventory
            ["Products"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Categories"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Warehouses"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["StockTransfer"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["DamagedStock"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Approve },

            // Sales & Orders
            ["POS"] = new[] { PermissionAction.View, PermissionAction.Add },
            ["Orders"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Coupons"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Customers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },

            // Accounting
            ["ChartOfAccounts"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
            ["JournalEntries"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["Ledger"] = new[] { PermissionAction.View },
            ["Invoices"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Vouchers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["FixedAssets"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Payroll"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["FinancialReports"] = new[] { PermissionAction.View },

            // Payments & Shipping
            ["PaymentGateways"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PaymentLinks"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["ShippingCompanies"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
        };

        // ============ 2. توليد كل الـ Permissions تلقائيًا ============
        var permissions = new List<Permission>();
        foreach (var module in moduleActions)
        {
            foreach (var action in module.Value)
            {
                permissions.Add(new Permission
                {
                    ModuleName = module.Key,
                    ActionType = action,
                    PermissionCode = $"{module.Key}.{action}"
                });
            }
        }
        await context.Permissions.AddRangeAsync(permissions);
        await context.SaveChangesAsync();

        var permByCode = permissions.ToDictionary(p => p.PermissionCode, p => p.Id);

        // ============ 3. تعريف الأدوار ============
        var roles = new List<Role>
        {
            new() { RoleName = "SuperAdmin", RoleScope = RoleScope.Platform, IsSystemRole = true },
            new() { RoleName = "SupportStaff", RoleScope = RoleScope.Platform, IsSystemRole = true },
            new() { RoleName = "Owner", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Accountant", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Cashier", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "InventoryManager", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "OrdersManager", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Marketing", RoleScope = RoleScope.Store, IsSystemRole = true },
        };
        await context.Roles.AddRangeAsync(roles);
        await context.SaveChangesAsync();

        var roleByName = roles.ToDictionary(r => r.RoleName, r => r.Id);

        // ============ 4. ربط كل دور بصلاحياته (مطابق للمصفوفة) ============
        var rolePermissionMap = new Dictionary<string, string[]>
        {
            ["SuperAdmin"] = moduleActions
                .Where(m => new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["SupportStaff"] = new[]
            {
                "StoreManagement.View", "StoreManagement.Edit",
                "PackageManagement.View", "PlatformUserManagement.View",
                "PlatformFinancialReports.View", "PlatformSettings.View", "AuditLog.View"
            },

            ["Owner"] = moduleActions
                .Where(m => !new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["Accountant"] = new[]
            {
                "StoreSettings.View", "SubscriptionPackage.View",
                "Products.View", "Categories.View", "Warehouses.View",
                "Orders.View", "Customers.View",
                "ChartOfAccounts.View", "ChartOfAccounts.Add", "ChartOfAccounts.Edit",
                "JournalEntries.View", "JournalEntries.Add", "JournalEntries.Edit",
                "Ledger.View",
                "Invoices.View", "Invoices.Add", "Invoices.Edit",
                "Vouchers.View", "Vouchers.Add", "Vouchers.Edit",
                "FixedAssets.View", "FixedAssets.Add", "FixedAssets.Edit",
                "Payroll.View", "FinancialReports.View",
                "PaymentGateways.View", "PaymentLinks.Add", "ShippingCompanies.View"
            },

            ["Cashier"] = new[]
            {
                "Products.View", "POS.View", "POS.Add",
                "Orders.View", "Orders.Add",
                "Customers.View", "Customers.Add",
                "Invoices.View", "Invoices.Add"
            },

            ["InventoryManager"] = new[]
            {
                "Products.View", "Products.Add", "Products.Edit",
                "Categories.View", "Categories.Add", "Categories.Edit",
                "Warehouses.View", "Warehouses.Add", "Warehouses.Edit",
                "StockTransfer.View", "StockTransfer.Add", "StockTransfer.Edit",
                "DamagedStock.View", "DamagedStock.Add",
                "Orders.View"
            },

            ["OrdersManager"] = new[]
            {
                "Products.View", "Orders.View", "Orders.Add", "Orders.Edit",
                "Coupons.View", "Customers.View", "Customers.Add", "Customers.Edit",
                "POS.View", "Warehouses.View", "ShippingCompanies.View"
            },

            ["Marketing"] = new[]
            {
                "Products.View", "Products.Edit",
                "Categories.View", "Orders.View",
                "Coupons.View", "Coupons.Add", "Coupons.Edit",
                "Customers.View"
            },
        };

        var rolePermissions = new List<RolePermission>();
        foreach (var map in rolePermissionMap)
        {
            var roleId = roleByName[map.Key];
            foreach (var code in map.Value)
            {
                if (permByCode.TryGetValue(code, out var permId))
                {
                    rolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permId });
                }
            }
        }
        await context.RolePermissions.AddRangeAsync(rolePermissions);
        await context.SaveChangesAsync();
    }

    private static async Task SeedPackagesAsync(AppDbContext context)
    {
        if (await context.Packages.AnyAsync()) return; // اتعمل قبل كده، متكررش

        const int Unlimited = -1;

        var packages = new List<Package>
        {
            new()
            {
                PackageName = "المجانية",
                MonthlyPrice = 0,
                MaxProducts = 20,
                MaxOrdersPerMonth = 30,
                MaxEmployees = 1,
                MaxWarehouses = 1,
                MaxBranchesPOS = 0,
                MaxPaymentGateways = 1,
                MaxShippingCompanies = 0,
                HasAccountingFull = false,
                HasPayroll = false,
                HasZatcaInvoice = false,
                HasCustomDomain = false,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                IsActive = true
            },
            new()
            {
                PackageName = "الإنطلاق",
                MonthlyPrice = 99,
                MaxProducts = 500,
                MaxOrdersPerMonth = 500,
                MaxEmployees = 3,
                MaxWarehouses = 2,
                MaxBranchesPOS = 1,
                MaxPaymentGateways = 2,
                MaxShippingCompanies = 1,
                HasAccountingFull = false,
                HasPayroll = false,
                HasZatcaInvoice = true,
                HasCustomDomain = false,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                IsActive = true
            },
            new()
            {
                PackageName = "التوسع",
                MonthlyPrice = 249,
                MaxProducts = 5000,
                MaxOrdersPerMonth = 5000,
                MaxEmployees = 10,
                MaxWarehouses = 5,
                MaxBranchesPOS = 3,
                MaxPaymentGateways = Unlimited,
                MaxShippingCompanies = 3,
                HasAccountingFull = true,
                HasPayroll = true,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = false,
                HasApiAccess = true,
                IsActive = true
            },
            new()
            {
                PackageName = "الريادة",
                MonthlyPrice = 499,
                MaxProducts = null,
                MaxOrdersPerMonth = null,
                MaxEmployees = Unlimited,
                MaxWarehouses = Unlimited,
                MaxBranchesPOS = Unlimited,
                MaxPaymentGateways = Unlimited,
                MaxShippingCompanies = Unlimited,
                HasAccountingFull = true,
                HasPayroll = true,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = true,
                HasApiAccess = true,
                IsActive = true
            }
        };

        await context.Packages.AddRangeAsync(packages);
        await context.SaveChangesAsync();
    }
}