using FatooraRahatak.Domain.Entities.Roles;

namespace FatooraRahatak.Domain.Entities.Roles;

public class RolePermission
{
    public long RoleId { get; set; }
    public long PermissionId { get; set; }

    // Navigation Properties
    public Role Role { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}