using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Admin;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class RoleService : IRoleService
{
    private readonly AppDbContext _context;

    public RoleService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PermissionDto>> GetAllPermissionsAsync()
    {
        return await _context.Permissions
            .OrderBy(p => p.ModuleName).ThenBy(p => p.ActionType)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                ModuleName = p.ModuleName,
                ActionType = p.ActionType.ToString(),
                PermissionCode = p.PermissionCode
            })
            .ToListAsync();
    }

    public async Task<List<RoleDto>> GetStoreRolesAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null) return new();

        var roles = await _context.Roles
            .Include(r => r.RolePermissions)
            .ThenInclude(rp => rp.Permission)
            .Where(r => r.RoleScope == RoleScope.Store)
            .OrderBy(r => r.RoleName)
            .ToListAsync();

        return roles.Select(r => new RoleDto
        {
            Id = r.Id,
            RoleName = r.RoleName,
            IsSystemRole = r.IsSystemRole,
            PermissionCodes = r.RolePermissions.Select(rp => rp.Permission.PermissionCode).ToList(),
            EmployeesCount = _context.Employees.Count(e => e.RoleId == r.Id && e.StoreId == store.Id)
        }).ToList();
    }

    public async Task<RoleDto> CreateRoleAsync(long ownerUserId, CreateRoleDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك");

        if (string.IsNullOrWhiteSpace(dto.RoleName))
            throw new InvalidOperationException("اسم المسمى الوظيفي مطلوب");

        var exists = await _context.Roles.AnyAsync(r => r.RoleName == dto.RoleName && r.RoleScope == RoleScope.Store);
        if (exists)
            throw new InvalidOperationException("يوجد مسمى وظيفي بنفس الاسم بالفعل");

        var role = new Role
        {
            RoleName = dto.RoleName.Trim(),
            RoleScope = RoleScope.Store,
            IsSystemRole = false
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        if (dto.PermissionCodes.Count > 0)
        {
            var permIds = await _context.Permissions
                .Where(p => dto.PermissionCodes.Contains(p.PermissionCode))
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var permId in permIds)
            {
                _context.RolePermissions.Add(new RolePermission { RoleId = role.Id, PermissionId = permId });
            }
            await _context.SaveChangesAsync();
        }

        return new RoleDto
        {
            Id = role.Id,
            RoleName = role.RoleName,
            IsSystemRole = false,
            PermissionCodes = dto.PermissionCodes
        };
    }

    public async Task UpdateRolePermissionsAsync(long ownerUserId, long roleId, UpdateRolePermissionsDto dto)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null)
            throw new InvalidOperationException("المسمى الوظيفي غير موجود");

        if (role.IsSystemRole && role.RoleName == "Owner")
            throw new InvalidOperationException("لا يمكن تعديل صلاحيات المالك");

        var existing = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
        _context.RolePermissions.RemoveRange(existing);

        if (dto.PermissionCodes.Count > 0)
        {
            var permIds = await _context.Permissions
                .Where(p => dto.PermissionCodes.Contains(p.PermissionCode))
                .Select(p => p.Id)
                .ToListAsync();

            foreach (var permId in permIds)
            {
                _context.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permId });
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task DeleteRoleAsync(long ownerUserId, long roleId)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null)
            throw new InvalidOperationException("المسمى الوظيفي غير موجود");

        if (role.IsSystemRole)
            throw new InvalidOperationException("لا يمكن حذف مسمى وظيفي أساسي");

        var hasEmployees = await _context.Employees.AnyAsync(e => e.RoleId == roleId);
        if (hasEmployees)
            throw new InvalidOperationException("لا يمكن حذف مسمى وظيفي له موظفين");

        var rolePerms = await _context.RolePermissions.Where(rp => rp.RoleId == roleId).ToListAsync();
        _context.RolePermissions.RemoveRange(rolePerms);
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();
    }
}
