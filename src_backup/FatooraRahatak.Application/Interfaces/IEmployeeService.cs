using FatooraRahatak.Application.DTOs.Employees;

namespace FatooraRahatak.Application.Interfaces;

public interface IEmployeeService
{
    Task<EmployeeResponseDto> CreateAsync(long storeId, CreateEmployeeDto dto);
    Task<List<EmployeeResponseDto>> GetAllAsync(long storeId);
    Task DeactivateAsync(long storeId, long employeeId);
}