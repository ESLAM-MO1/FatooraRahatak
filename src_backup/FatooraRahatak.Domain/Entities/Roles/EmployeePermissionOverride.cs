using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Employees;

namespace FatooraRahatak.Domain.Entities.Roles;

public class EmployeePermissionOverride : BaseEntity
{
    public long EmployeeId { get; set; }
    public long PermissionId { get; set; }
    public bool IsGranted { get; set; }

    // Navigation Properties
    public Employee Employee { get; set; } = null!;
    public Permission Permission { get; set; } = null!;
}