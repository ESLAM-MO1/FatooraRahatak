using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Employees;

public class Payroll : BaseEntity
{
    public long EmployeeId { get; set; }
    public DateOnly PeriodMonth { get; set; } 
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; } = 0;
    public decimal Deductions { get; set; } = 0;
    public decimal Commission { get; set; } = 0;
    public decimal NetSalary { get; set; }
    public PayrollStatus Status { get; set; } = PayrollStatus.Draft;
    public long? ApprovedByUserId { get; set; }
    public DateTime? PaidAt { get; set; }

    // ===== تاسك 15 (جديد): ربط الراتب بالقيد المحاسبي التلقائي الناتج عند الاعتماد =====
    public long? JournalEntryId { get; set; }

    public Employee Employee { get; set; } = null!;
    public User? ApprovedBy { get; set; }
    public JournalEntry? JournalEntry { get; set; }
}