using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class EmployeeService : IEmployeeService
{
    private readonly AppDbContext _context;

    public EmployeeService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeResponseDto> CreateAsync(long storeId, CreateEmployeeDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود");

        var currentCount = await _context.Employees.CountAsync(e => e.StoreId == storeId);
        if (!PackageLimitHelper.IsWithinLimit(store.Package.MaxEmployees, currentCount))
            throw new InvalidOperationException($"وصلت للحد الأقصى لعدد الموظفين في باقتك ({store.Package.MaxEmployees}). قم بترقية باقتك.");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.RoleName
            && r.RoleScope == RoleScope.Store
            && (r.StoreId == null || r.StoreId == storeId));
        if (role == null)
            throw new InvalidOperationException("الدور الوظيفي غير موجود");
        if (role.RoleName == "Owner")
            throw new InvalidOperationException("لا يمكن إسناد دور المالك إلى موظف");

        var emailExists = await _context.Users.AnyAsync(u => u.Email == dto.Email || u.Phone == dto.Phone);
        if (emailExists)
            throw new InvalidOperationException("البريد الإلكتروني أو رقم الجوال مستخدم بالفعل");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            UserType = UserType.Employee,
            IsActive = true,
            IsVerified = false
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var employee = new Employee
        {
            UserId = user.Id,
            StoreId = storeId,
            RoleId = role.Id,
            HireDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Salary = dto.Salary,
            Status = "Active"
        };
        _context.Employees.Add(employee);
        await _context.SaveChangesAsync();

        return new EmployeeResponseDto
        {
            Id = employee.Id,
            FullName = user.FullName,
            Email = user.Email,
            RoleName = role.RoleName,
            Salary = employee.Salary,
            Status = employee.Status,
            HireDate = employee.HireDate,
            Phone = user.Phone
        };
    }

    public async Task<PagedResult<EmployeeResponseDto>> GetAllAsync(long storeId, int page = 1, int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Employees
            .Include(e => e.User)
            .Include(e => e.Role)
            .Where(e => e.StoreId == storeId);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(e => e.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(e => new EmployeeResponseDto
            {
                Id = e.Id,
                FullName = e.User.FullName,
                Email = e.User.Email,
                RoleName = e.Role.RoleName,
                Salary = e.Salary,
                Status = e.Status,
                HireDate = e.HireDate,
                Phone = e.User.Phone
            })
            .ToListAsync();

        return new PagedResult<EmployeeResponseDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = items
        };
    }

    public async Task<EmployeeResponseDto?> GetByIdAsync(long storeId, long employeeId)
    {
        return await _context.Employees
            .Include(e => e.User)
            .Include(e => e.Role)
            .Where(e => e.Id == employeeId && e.StoreId == storeId)
            .Select(e => new EmployeeResponseDto
            {
                Id = e.Id,
                FullName = e.User.FullName,
                Email = e.User.Email,
                RoleName = e.Role.RoleName,
                Salary = e.Salary,
                Status = e.Status,
                HireDate = e.HireDate,
                Phone = e.User.Phone
            })
            .FirstOrDefaultAsync();
    }

    public async Task<EmployeeResponseDto> UpdateAsync(long storeId, long employeeId, UpdateEmployeeDto dto)
    {
        var employee = await _context.Employees
            .Include(e => e.User)
            .Include(e => e.Role)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.StoreId == storeId);

        if (employee == null)
            throw new InvalidOperationException("الموظف غير موجود");

        var role = await _context.Roles.FirstOrDefaultAsync(r => r.RoleName == dto.RoleName
            && r.RoleScope == RoleScope.Store
            && (r.StoreId == null || r.StoreId == storeId));
        if (role == null)
            throw new InvalidOperationException("الدور الوظيفي غير موجود");

        employee.User.FullName = dto.FullName;
        employee.User.Phone = dto.Phone;
        employee.RoleId = role.Id;
        employee.Role = role;
        employee.Salary = dto.Salary;
        employee.Status = dto.Status;

        await _context.SaveChangesAsync();

        return new EmployeeResponseDto
        {
            Id = employee.Id,
            FullName = employee.User.FullName,
            Email = employee.User.Email,
            RoleName = role.RoleName,
            Salary = employee.Salary,
            Status = employee.Status,
            HireDate = employee.HireDate,
            Phone = employee.User.Phone
        };
    }

    public async Task DeactivateAsync(long storeId, long employeeId)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.StoreId == storeId);

        if (employee == null)
            throw new InvalidOperationException("الموظف غير موجود");

        employee.Status = "Terminated";
        await _context.SaveChangesAsync();
    }
}