using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Employees;
using Xunit;

namespace FatooraRahatak.Tests;

public static class Seed
{
    private static readonly string[] PlatformModules =
    {
        "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog"
    };

    public static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase($"rbac-{Guid.NewGuid():N}")
            .Options;
        return new AppDbContext(options);
    }

    public static async Task<AppDbContext> SeedPermissionsAsync(AppDbContext ctx)
    {
        var codes = new[]
        {
            new Permission { ModuleName = "StoreManagement", ActionType = PermissionAction.View, PermissionCode = "StoreManagement.View" },
            new Permission { ModuleName = "Products", ActionType = PermissionAction.View, PermissionCode = "Products.View" },
            new Permission { ModuleName = "Products", ActionType = PermissionAction.Add, PermissionCode = "Products.Add" },
            new Permission { ModuleName = "Orders", ActionType = PermissionAction.View, PermissionCode = "Orders.View" },
            new Permission { ModuleName = "FinancialReports", ActionType = PermissionAction.View, PermissionCode = "FinancialReports.View" },
            new Permission { ModuleName = "AuditLog", ActionType = PermissionAction.View, PermissionCode = "AuditLog.View" }
        };
        ctx.Permissions.AddRange(codes);
        await ctx.SaveChangesAsync();
        return ctx;
    }

    public static async Task<User> AddUserAsync(AppDbContext ctx, string email, UserType type, string? staffRole = null)
    {
        var user = new User { FullName = email, Email = email, UserType = type, StaffRole = staffRole, IsActive = true };
        ctx.Users.Add(user);
        await ctx.SaveChangesAsync();
        return user;
    }

    public static async Task<Store> AddStoreAsync(AppDbContext ctx, User owner)
    {
        var store = new Store { StoreName = $"{owner.Email}-store", StoreSlug = Guid.NewGuid().ToString("N")[..8], OwnerUserId = owner.Id };
        ctx.Stores.Add(store);
        await ctx.SaveChangesAsync();
        return store;
    }

    public static async Task<(Role role, Permission[] perms)> AddRoleAsync(AppDbContext ctx, string name, params string[] codes)
    {
        var perms = await ctx.Permissions.Where(p => codes.Contains(p.PermissionCode)).ToListAsync();
        if (perms.Count == 0)
        {
            perms = codes.Select(c => new Permission { ModuleName = c.Split('.')[0], ActionType = PermissionAction.View, PermissionCode = c }).ToList();
            ctx.Permissions.AddRange(perms);
        }
        var role = new Role { RoleName = name, RoleScope = RoleScope.Store, IsSystemRole = true };
        ctx.Roles.Add(role);
        await ctx.SaveChangesAsync();
        foreach (var p in perms)
            ctx.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = p.Id });
        await ctx.SaveChangesAsync();
        return (role, perms.ToArray());
    }

    public static async Task AddEmployeeAsync(AppDbContext ctx, User user, long storeId, long roleId)
    {
        ctx.Employees.Add(new Employee { UserId = user.Id, StoreId = storeId, RoleId = roleId, Status = "Active" });
        await ctx.SaveChangesAsync();
    }
}

public class PermissionCheckServiceTests
{
    private PermissionCheckService GetService(AppDbContext ctx) => new(ctx);

    [Fact]
    public async Task Owner_has_all_store_permissions_but_no_platform_admin_permissions()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var owner = await Seed.AddUserAsync(ctx, "owner@x.com", UserType.Owner);
        var service = GetService(ctx);

        Assert.True(await service.UserHasPermissionAsync(owner.Id, "Products.View"));
        Assert.True(await service.UserHasPermissionAsync(owner.Id, "Orders.View"));

        Assert.False(await service.UserHasPermissionAsync(owner.Id, "StoreManagement.View"));
        Assert.False(await service.UserHasPermissionAsync(owner.Id, "AuditLog.View"));

        var codes = await service.GetUserPermissionCodesAsync(owner.Id);
        Assert.DoesNotContain("StoreManagement.View", codes);
        Assert.DoesNotContain("AuditLog.View", codes);
        Assert.Contains("Products.View", codes);
    }

    [Fact]
    public async Task SuperAdmin_has_platform_admin_permissions()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var admin = await Seed.AddUserAsync(ctx, "admin@x.com", UserType.SuperAdmin);
        var service = GetService(ctx);

        Assert.True(await service.UserHasPermissionAsync(admin.Id, "StoreManagement.View"));
        Assert.True(await service.UserHasPermissionAsync(admin.Id, "AuditLog.View"));
        var codes = await service.GetUserPermissionCodesAsync(admin.Id);
        Assert.Contains("StoreManagement.View", codes);
        Assert.Contains("AuditLog.View", codes);
    }

    [Fact]
    public async Task SupportStaff_never_inherits_owner_or_admin_access()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var staff = await Seed.AddUserAsync(ctx, "staff@x.com", UserType.SupportStaff, "Support");
        var service = GetService(ctx);

        Assert.False(await service.UserHasPermissionAsync(staff.Id, "Products.View"));
        Assert.False(await service.UserHasPermissionAsync(staff.Id, "StoreManagement.View"));
        Assert.False(await service.UserHasPermissionAsync(staff.Id, "Orders.View"));
        Assert.Empty(await service.GetUserPermissionCodesAsync(staff.Id));
    }

    [Fact]
    public async Task Employee_gets_exactly_its_role_permissions_no_privilege_escalation()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var owner = await Seed.AddUserAsync(ctx, "owner2@x.com", UserType.Owner);
        var store = await Seed.AddStoreAsync(ctx, owner);

        var (role, _) = await Seed.AddRoleAsync(ctx, "Cashier", "Orders.View");
        var emp = await Seed.AddUserAsync(ctx, "cashier@x.com", UserType.Employee);
        await Seed.AddEmployeeAsync(ctx, emp, store.Id, role.Id);

        var service = GetService(ctx);
        Assert.True(await service.UserHasPermissionAsync(emp.Id, "Orders.View"));
        Assert.False(await service.UserHasPermissionAsync(emp.Id, "Products.View"));
        Assert.False(await service.UserHasPermissionAsync(emp.Id, "StoreManagement.View"));
        _ = role;
    }

    [Fact]
    public async Task Every_role_must_be_explicitly_granted_no_default_owner_fallback()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var owner = await Seed.AddUserAsync(ctx, "owner3@x.com", UserType.Owner);
        var store = await Seed.AddStoreAsync(ctx, owner);

        var (role, _) = await Seed.AddRoleAsync(ctx, "CompanyAdmin", "Products.Add", "Products.View");
        var emp = await Seed.AddUserAsync(ctx, "admin-emp@x.com", UserType.Employee);
        await Seed.AddEmployeeAsync(ctx, emp, store.Id, role.Id);

        var service = GetService(ctx);
        Assert.True(await service.UserHasPermissionAsync(emp.Id, "Products.Add"));
        Assert.False(await service.UserHasPermissionAsync(emp.Id, "Orders.View"));
        Assert.False(await service.UserHasPermissionAsync(emp.Id, "StoreManagement.View"));
        _ = role;
    }

    [Fact]
    public async Task Employee_without_any_role_has_zero_permissions()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var owner = await Seed.AddUserAsync(ctx, "owner4@x.com", UserType.Owner);
        var store = await Seed.AddStoreAsync(ctx, owner);

        var employee = await Seed.AddUserAsync(ctx, "noop@x.com", UserType.Employee);
        ctx.Employees.Add(new Employee { UserId = employee.Id, StoreId = store.Id, RoleId = 0, Status = "Active" });
        await ctx.SaveChangesAsync();

        var service = GetService(ctx);
        Assert.False(await service.UserHasPermissionAsync(employee.Id, "Orders.View"));
        Assert.Empty(await service.GetUserPermissionCodesAsync(employee.Id));
    }

    [Fact]
    public async Task Permission_overrides_grant_and_revoke_are_respected()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var owner = await Seed.AddUserAsync(ctx, "owner5@x.com", UserType.Owner);
        var store = await Seed.AddStoreAsync(ctx, owner);

        var (role, _) = await Seed.AddRoleAsync(ctx, "Manager", "Products.View", "Products.Add");
        var emp = await Seed.AddUserAsync(ctx, "manager@x.com", UserType.Employee);
        await Seed.AddEmployeeAsync(ctx, emp, store.Id, role.Id);

        var prodAdd = await ctx.Permissions.FirstAsync(p => p.PermissionCode == "Products.Add");
        var empRow = await ctx.Employees.FirstAsync(e => e.UserId == emp.Id);
        ctx.EmployeePermissionOverrides.Add(new EmployeePermissionOverride
        {
            EmployeeId = empRow.Id,
            PermissionId = prodAdd.Id,
            IsGranted = false
        });
        await ctx.SaveChangesAsync();

        var service = GetService(ctx);
        Assert.True(await service.UserHasPermissionAsync(emp.Id, "Products.View"));
        Assert.False(await service.UserHasPermissionAsync(emp.Id, "Products.Add"));
    }

    [Fact]
    public async Task UserHasPermission_returns_false_for_unknown_user()
    {
        var ctx = await Seed.SeedPermissionsAsync(Seed.CreateContext());
        var service = GetService(ctx);
        Assert.False(await service.UserHasPermissionAsync(999999, "Products.View"));
    }
}