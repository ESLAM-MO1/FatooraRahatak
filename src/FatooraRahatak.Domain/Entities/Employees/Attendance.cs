using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Employees;

public class Attendance : BaseEntity
{
    public long EmployeeId { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly? CheckInTime { get; set; }
    public TimeOnly? CheckOutTime { get; set; }
    public string? Notes { get; set; }

    // تتبع مصدر التسجيل (يدوي / بصمة / NFC / وجه) + من سجّله + الجهاز
    public AttendanceMethod Method { get; set; } = AttendanceMethod.Manual;
    public long? CreatedByUserId { get; set; }
    public long? DeviceId { get; set; }

    public Employee Employee { get; set; } = null!;
}