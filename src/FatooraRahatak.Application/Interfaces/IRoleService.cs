using FatooraRahatak.Application.DTOs.Admin;

namespace FatooraRahatak.Application.Interfaces;

public interface IRoleService
{
    Task<List<PermissionDto>> GetAllPermissionsAsync();
    Task<List<RoleDto>> GetStoreRolesAsync(long ownerUserId);
    Task<RoleDto> CreateRoleAsync(long ownerUserId, CreateRoleDto dto);
    Task UpdateRolePermissionsAsync(long ownerUserId, long roleId, UpdateRolePermissionsDto dto);
    Task DeleteRoleAsync(long ownerUserId, long roleId);
}
