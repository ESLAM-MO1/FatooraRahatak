namespace FatooraRahatak.Application.DTOs.Employees;

public class UpdatePayrollDto
{
    public decimal Allowances { get; set; } = 0;
    public decimal Deductions { get; set; } = 0;
    public decimal Commission { get; set; } = 0;
}