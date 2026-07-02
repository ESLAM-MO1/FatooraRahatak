using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class PayrollService : IPayrollService
{
    private readonly AppDbContext _context;

    public PayrollService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<PayrollResponseDto>> GenerateMonthlyPayrollAsync(long storeId, GeneratePayrollDto dto)
    {
        var periodMonth = new DateOnly(dto.Year, dto.Month, 1);

        var alreadyExists = await _context.Payrolls
            .AnyAsync(p => p.PeriodMonth == periodMonth && p.Employee.StoreId == storeId);
        if (alreadyExists)
            throw new InvalidOperationException("تم إنشاء رواتب هذا الشهر بالفعل");

        var employees = await _context.Employees
            .Include(e => e.User)
            .Where(e => e.StoreId == storeId && e.Status == "Active")
            .ToListAsync();

        if (!employees.Any())
            throw new InvalidOperationException("لا يوجد موظفين نشطين لإنشاء رواتب لهم");

        var payrolls = new List<Payroll>();
        foreach (var emp in employees)
        {
            var payroll = new Payroll
            {
                EmployeeId = emp.Id,
                PeriodMonth = periodMonth,
                BasicSalary = emp.Salary,
                Allowances = 0,
                Deductions = 0,
                Commission = 0,
                NetSalary = emp.Salary,
                Status = PayrollStatus.Draft
            };
            payrolls.Add(payroll);
        }

        _context.Payrolls.AddRange(payrolls);
        await _context.SaveChangesAsync();

        return payrolls.Select(p => MapToDto(p, employees.First(e => e.Id == p.EmployeeId).User.FullName)).ToList();
    }

    public async Task<PayrollResponseDto> UpdatePayrollAsync(long storeId, long payrollId, UpdatePayrollDto dto)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee).ThenInclude(e => e.User)
            .FirstOrDefaultAsync(p => p.Id == payrollId && p.Employee.StoreId == storeId);

        if (payroll == null)
            throw new InvalidOperationException("سجل الراتب غير موجود");

        if (payroll.Status != PayrollStatus.Draft)
            throw new InvalidOperationException("لا يمكن تعديل راتب معتمد أو مدفوع بالفعل");

        payroll.Allowances = dto.Allowances;
        payroll.Deductions = dto.Deductions;
        payroll.Commission = dto.Commission;
        payroll.NetSalary = payroll.BasicSalary + dto.Allowances + dto.Commission - dto.Deductions;

        await _context.SaveChangesAsync();

        return MapToDto(payroll, payroll.Employee.User.FullName);
    }

    public async Task ApprovePayrollAsync(long storeId, long payrollId, long approvedByUserId)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == payrollId && p.Employee.StoreId == storeId);

        if (payroll == null)
            throw new InvalidOperationException("سجل الراتب غير موجود");

        if (payroll.Status != PayrollStatus.Draft)
            throw new InvalidOperationException("تم اعتماد هذا الراتب بالفعل");

        payroll.Status = PayrollStatus.Approved;
        payroll.ApprovedByUserId = approvedByUserId;

        await _context.SaveChangesAsync();
    }

    public async Task MarkAsPaidAsync(long storeId, long payrollId)
    {
        var payroll = await _context.Payrolls
            .Include(p => p.Employee)
            .FirstOrDefaultAsync(p => p.Id == payrollId && p.Employee.StoreId == storeId);

        if (payroll == null)
            throw new InvalidOperationException("سجل الراتب غير موجود");

        if (payroll.Status != PayrollStatus.Approved)
            throw new InvalidOperationException("لا يمكن صرف راتب غير معتمد");

        payroll.Status = PayrollStatus.Paid;
        payroll.PaidAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<List<PayrollResponseDto>> GetPayrollsAsync(long storeId, int? year, int? month)
    {
        var query = _context.Payrolls
            .Include(p => p.Employee).ThenInclude(e => e.User)
            .Where(p => p.Employee.StoreId == storeId);

        if (year.HasValue)
            query = query.Where(p => p.PeriodMonth.Year == year.Value);

        if (month.HasValue)
            query = query.Where(p => p.PeriodMonth.Month == month.Value);

        var records = await query.OrderByDescending(p => p.PeriodMonth).ToListAsync();

        return records.Select(p => MapToDto(p, p.Employee.User.FullName)).ToList();
    }

    private static PayrollResponseDto MapToDto(Payroll p, string employeeName) => new()
    {
        Id = p.Id,
        EmployeeId = p.EmployeeId,
        EmployeeName = employeeName,
        PeriodMonth = p.PeriodMonth,
        BasicSalary = p.BasicSalary,
        Allowances = p.Allowances,
        Deductions = p.Deductions,
        Commission = p.Commission,
        NetSalary = p.NetSalary,
        Status = p.Status.ToString()
    };
}