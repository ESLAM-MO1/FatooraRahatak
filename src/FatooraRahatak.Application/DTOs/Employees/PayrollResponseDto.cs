namespace FatooraRahatak.Application.DTOs.Employees;

public class PayrollResponseDto
{
    public long Id { get; set; }
    public long EmployeeId { get; set; }
    public string EmployeeName { get; set; } = string.Empty;
    public DateOnly PeriodMonth { get; set; }
    public decimal BasicSalary { get; set; }
    public decimal Allowances { get; set; }
    public decimal Deductions { get; set; }
    public decimal Commission { get; set; }
    public decimal NetSalary { get; set; }
    public string Status { get; set; } = string.Empty;
}