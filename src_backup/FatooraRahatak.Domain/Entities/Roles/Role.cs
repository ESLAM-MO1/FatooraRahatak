using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Employees;
namespace FatooraRahatak.Domain.Entities.Roles;

public class Role : BaseEntity
{
    public string RoleName { get; set; } = string.Empty;
    public RoleScope RoleScope { get; set; }
    public bool IsSystemRole { get; set; } = true;

    // Navigation Properties
    public ICollection<RolePermission> RolePermissions { get; set; } = new List<RolePermission>();
    public ICollection<Employee> Employees { get; set; } = new List<Employee>();
}