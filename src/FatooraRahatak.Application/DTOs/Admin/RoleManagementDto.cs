namespace FatooraRahatak.Application.DTOs.Admin;

public class PermissionDto
{
    public long Id { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string PermissionCode { get; set; } = string.Empty;
}

public class RoleDto
{
    public long Id { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public bool IsSystemRole { get; set; }
    public List<string> PermissionCodes { get; set; } = new();
    public int EmployeesCount { get; set; }
}

public class CreateRoleDto
{
    public string RoleName { get; set; } = string.Empty;
    public List<string> PermissionCodes { get; set; } = new();
}

public class UpdateRolePermissionsDto
{
    public List<string> PermissionCodes { get; set; } = new();
}
