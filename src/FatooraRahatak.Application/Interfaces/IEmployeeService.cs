using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Employees;

namespace FatooraRahatak.Application.Interfaces;

public interface IEmployeeService
{
    Task<EmployeeResponseDto> CreateAsync(long storeId, CreateEmployeeDto dto);
    Task<PagedResult<EmployeeResponseDto>> GetAllAsync(long storeId, int page = 1, int pageSize = 20);
    Task<EmployeeResponseDto?> GetByIdAsync(long storeId, long employeeId);
    Task<EmployeeResponseDto> UpdateAsync(long storeId, long employeeId, UpdateEmployeeDto dto);
    Task DeactivateAsync(long storeId, long employeeId);
}