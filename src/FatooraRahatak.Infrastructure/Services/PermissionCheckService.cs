using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class PermissionCheckService : IPermissionCheckService
{
    private readonly AppDbContext _context;

    public PermissionCheckService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<bool> UserHasPermissionAsync(long userId, string permissionCode)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return false;

        if (user.UserType == UserType.SuperAdmin || user.UserType == UserType.Owner)
            return true;

        if (user.UserType != UserType.Employee)
            return false;

        var employee = await _context.Employees
            .Include(e => e.PermissionOverrides)
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");

        if (employee == null) return false;

        var overridePerm = employee.PermissionOverrides
            .FirstOrDefault(o => o.Permission!.PermissionCode == permissionCode);

        if (overridePerm != null)
            return overridePerm.IsGranted;

        var hasRolePerm = await _context.RolePermissions
            .Include(rp => rp.Permission)
            .AnyAsync(rp => rp.RoleId == employee.RoleId && rp.Permission!.PermissionCode == permissionCode);

        return hasRolePerm;
    }

    public async Task EnsurePermissionAsync(long userId, string permissionCode)
    {
        if (!await UserHasPermissionAsync(userId, permissionCode))
            throw new UnauthorizedAccessException("ليس لديك صلاحية لتنفيذ هذا الإجراء");
    }

    public async Task<long?> GetUserStoreIdAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return null;

        if (user.UserType == UserType.Employee)
        {
            var employee = await _context.Employees
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");
            return employee?.StoreId;
        }

        var store = await _context.Stores.AsNoTracking()
            .FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        return store?.Id;
    }

    public async Task<List<string>> GetUserPermissionCodesAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return new();

        if (user.UserType == UserType.SuperAdmin)
            return await _context.Permissions
                .Where(p => p.ModuleName.StartsWith("Platform")
                            || new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }
                                .Contains(p.ModuleName))
                .Select(p => p.PermissionCode)
                .ToListAsync();

        if (user.UserType == UserType.Owner)
            return await _context.Permissions
                .Where(p => !new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }
                    .Contains(p.ModuleName))
                .Select(p => p.PermissionCode)
                .ToListAsync();

        if (user.UserType != UserType.Employee)
            return new();

        var employee = await _context.Employees
            .Include(e => e.PermissionOverrides)
            .ThenInclude(o => o.Permission)
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");

        if (employee == null) return new();

        var rolePerms = await _context.RolePermissions
            .Include(rp => rp.Permission)
            .Where(rp => rp.RoleId == employee.RoleId)
            .Select(rp => rp.Permission!.PermissionCode)
            .ToListAsync();

        var result = rolePerms.ToHashSet();
        foreach (var o in employee.PermissionOverrides)
        {
            if (o.Permission == null) continue;
            if (o.IsGranted) result.Add(o.Permission.PermissionCode);
            else result.Remove(o.Permission.PermissionCode);
        }

        return result.ToList();
    }
}
