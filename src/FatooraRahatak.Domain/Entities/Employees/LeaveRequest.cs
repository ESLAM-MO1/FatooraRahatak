using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Employees;

public class LeaveRequest : BaseEntity
{
    public long EmployeeId { get; set; }
    public LeaveType LeaveType { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public string? Reason { get; set; }
    public LeaveRequestStatus Status { get; set; } = LeaveRequestStatus.Pending;
    public long? ApprovedByUserId { get; set; }

    public Employee Employee { get; set; } = null!;
    public User? ApprovedBy { get; set; }
}