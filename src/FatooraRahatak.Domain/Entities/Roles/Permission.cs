using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Roles;

public class Permission : BaseEntity
{
    public string ModuleName { get; set; } = string.Empty;
    public PermissionAction ActionType { get; set; }
    public string PermissionCode { get; set; } = string.Empty;

    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<EmployeePermissionOverride> EmployeeOverrides { get; set; } = new List<EmployeePermissionOverride>();
}