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
}
