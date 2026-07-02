using FatooraRahatak.Application.DTOs.Employees;

namespace FatooraRahatak.Application.Interfaces;

public interface IAttendanceService
{
    Task<AttendanceResponseDto> CheckInAsync(long storeId, CheckInOutDto dto);
    Task<AttendanceResponseDto> CheckOutAsync(long storeId, CheckInOutDto dto);
    Task<List<AttendanceResponseDto>> GetAttendanceAsync(long storeId, long? employeeId, DateOnly? from, DateOnly? to);

    Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(long storeId, CreateLeaveRequestDto dto);
    Task<List<LeaveRequestResponseDto>> GetLeaveRequestsAsync(long storeId, long? employeeId);
    Task ApproveLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId);
    Task RejectLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId);
}