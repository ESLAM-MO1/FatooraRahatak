using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Employees;

public class Attendance : BaseEntity
{
    public long EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public string? Notes { get; set; }

    public Employee Employee { get; set; } = null!;
}