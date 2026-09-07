using FatooraRahatak.Application.DTOs.Employees;

namespace FatooraRahatak.Application.Interfaces;

public interface IPayrollService
{
    Task<List<PayrollResponseDto>> GenerateMonthlyPayrollAsync(long storeId, GeneratePayrollDto dto);
    Task<PayrollResponseDto> UpdatePayrollAsync(long storeId, long payrollId, UpdatePayrollDto dto);
    Task<PayrollResponseDto> ApprovePayrollAsync(long storeId, long payrollId, long approvedByUserId);

    Task MarkAsPaidAsync(long storeId, long payrollId, long userId);
    Task<List<PayrollResponseDto>> GetPayrollsAsync(long storeId, int? year, int? month);
}