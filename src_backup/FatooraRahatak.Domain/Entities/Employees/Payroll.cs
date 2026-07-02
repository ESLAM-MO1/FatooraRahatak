using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Employees;

public class Payroll : BaseEntity
{
    public long EmployeeId { get; set; }
    public DateOnly PeriodMonth { get; set; } // أول يوم في الشهر المستحق عنه الراتب
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; } = 0;
    public decimal Deductions { get; set; } = 0;
    public decimal Commission { get; set; } = 0;
    public decimal NetSalary { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public long? ApprovedByUserId { get; set; }
    public DateTime? PaidAt { get; set; }

    public Employee Employee { get; set; } = null!;
    public User? ApprovedBy { get; set; }
}