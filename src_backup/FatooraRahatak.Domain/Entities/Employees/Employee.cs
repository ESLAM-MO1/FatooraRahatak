using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Roles;

namespace FatooraRahatak.Domain.Entities.Employees;

public class Employee : BaseEntity
{
    public long UserId { get; set; }
    public long StoreId { get; set; }
    public long RoleId { get; set; }
    public DateOnly HireDate { get; set; }
    public decimal Salary { get; set; }
    public string Status { get; set; } = "Active";

    // Navigation Properties
    public User User { get; set; } = null!;
    public Store Store { get; set; } = null!;
    public Role Role { get; set; } = null!;
    public ICollection<EmployeePermissionOverride> PermissionOverrides { get; set; } = new List<EmployeePermissionOverride>();
    public ICollection<Attendance> AttendanceRecords { get; set; } = new List<Attendance>();
    public ICollection<LeaveRequest> LeaveRequests { get; set; } = new List<LeaveRequest>();
    public ICollection<Payroll> PayrollRecords { get; set; } = new List<Payroll>();
}