using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Employees;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Employees;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class AttendanceService : IAttendanceService
{
    private readonly AppDbContext _context;

    public AttendanceService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<Employee> GetOwnedEmployeeAsync(long storeId, long employeeId)
    {
        var employee = await _context.Employees
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.Id == employeeId && e.StoreId == storeId);

        if (employee == null)
            throw new InvalidOperationException("الموظف غير موجود");

        return employee;
    }

    public async Task<AttendanceResponseDto> CheckInAsync(long storeId, CheckInOutDto dto)
    {
        var employee = await GetOwnedEmployeeAsync(storeId, dto.EmployeeId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var existing = await _context.Attendances
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == today);

        if (existing != null)
            throw new InvalidOperationException("تم تسجيل الحضور بالفعل اليوم");

        var attendance = new Attendance
        {
            EmployeeId = dto.EmployeeId,
            Date = today,
            CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow)
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return MapToDto(attendance, employee.User.FullName);
    }

    public async Task<AttendanceResponseDto> CheckOutAsync(long storeId, CheckInOutDto dto)
    {
        var employee = await GetOwnedEmployeeAsync(storeId, dto.EmployeeId);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var attendance = await _context.Attendances
            .FirstOrDefaultAsync(a => a.EmployeeId == dto.EmployeeId && a.Date == today);

        if (attendance == null)
            throw new InvalidOperationException("لم يتم تسجيل حضور اليوم بعد");

        if (attendance.CheckOutTime != null)
            throw new InvalidOperationException("تم تسجيل الانصراف بالفعل اليوم");

        attendance.CheckOutTime = TimeOnly.FromDateTime(DateTime.UtcNow);
        await _context.SaveChangesAsync();

        return MapToDto(attendance, employee.User.FullName);
    }

    public async Task<List<AttendanceResponseDto>> GetAttendanceAsync(long storeId, long? employeeId, DateOnly? from, DateOnly? to)
    {
        var query = _context.Attendances
            .Include(a => a.Employee).ThenInclude(e => e.User)
            .Where(a => a.Employee.StoreId == storeId);

        if (employeeId.HasValue)
            query = query.Where(a => a.EmployeeId == employeeId.Value);

        if (from.HasValue)
            query = query.Where(a => a.Date >= from.Value);

        if (to.HasValue)
            query = query.Where(a => a.Date <= to.Value);

        var records = await query.OrderByDescending(a => a.Date).ToListAsync();

        return records.Select(a => MapToDto(a, a.Employee.User.FullName)).ToList();
    }

    public async Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(long storeId, CreateLeaveRequestDto dto)
    {
        var employee = await GetOwnedEmployeeAsync(storeId, dto.EmployeeId);

        if (!Enum.TryParse<LeaveType>(dto.LeaveType, out var leaveType))
            throw new InvalidOperationException("نوع الإجازة غير صحيح");

        if (dto.EndDate < dto.StartDate)
            throw new InvalidOperationException("تاريخ النهاية يجب أن يكون بعد تاريخ البداية");

        var leaveRequest = new LeaveRequest
        {
            EmployeeId = dto.EmployeeId,
            LeaveType = leaveType,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            Reason = dto.Reason,
            Status = LeaveRequestStatus.Pending
        };

        _context.LeaveRequests.Add(leaveRequest);
        await _context.SaveChangesAsync();

        return MapLeaveToDto(leaveRequest, employee.User.FullName);
    }

    public async Task<List<LeaveRequestResponseDto>> GetLeaveRequestsAsync(long storeId, long? employeeId)
    {
        var query = _context.LeaveRequests
            .Include(l => l.Employee).ThenInclude(e => e.User)
            .Where(l => l.Employee.StoreId == storeId);

        if (employeeId.HasValue)
            query = query.Where(l => l.EmployeeId == employeeId.Value);

        var records = await query.OrderByDescending(l => l.CreatedAt).ToListAsync();

        return records.Select(l => MapLeaveToDto(l, l.Employee.User.FullName)).ToList();
    }

    public async Task ApproveLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId)
    {
        var leave = await _context.LeaveRequests
            .Include(l => l.Employee)
            .FirstOrDefaultAsync(l => l.Id == leaveRequestId && l.Employee.StoreId == storeId);

        if (leave == null)
            throw new InvalidOperationException("طلب الإجازة غير موجود");

        if (leave.Status != LeaveRequestStatus.Pending)
            throw new InvalidOperationException("تمت معالجة هذا الطلب بالفعل");

        leave.Status = LeaveRequestStatus.Approved;
        leave.ApprovedByUserId = approvedByUserId;
        await _context.SaveChangesAsync();
    }

    public async Task RejectLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId)
    {
        var leave = await _context.LeaveRequests
            .Include(l => l.Employee)
            .FirstOrDefaultAsync(l => l.Id == leaveRequestId && l.Employee.StoreId == storeId);

        if (leave == null)
            throw new InvalidOperationException("طلب الإجازة غير موجود");

        if (leave.Status != LeaveRequestStatus.Pending)
            throw new InvalidOperationException("تمت معالجة هذا الطلب بالفعل");

        leave.Status = LeaveRequestStatus.Rejected;
        leave.ApprovedByUserId = approvedByUserId;
        await _context.SaveChangesAsync();
    }

    private static AttendanceResponseDto MapToDto(Attendance a, string employeeName) => new()
    {
        Id = a.Id,
        EmployeeId = a.EmployeeId,
        EmployeeName = employeeName,
        Date = a.Date,
        CheckInTime = a.CheckInTime,
        CheckOutTime = a.CheckOutTime
    };

    private static LeaveRequestResponseDto MapLeaveToDto(LeaveRequest l, string employeeName) => new()
    {
        Id = l.Id,
        EmployeeId = l.EmployeeId,
        EmployeeName = employeeName,
        LeaveType = l.LeaveType.ToString(),
        StartDate = l.StartDate,
        EndDate = l.EndDate,
        Reason = l.Reason,
        Status = l.Status.ToString()
    };
}