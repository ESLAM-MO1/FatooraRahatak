using FatooraRahatak.Application.DTOs.Employees;

namespace FatooraRahatak.Application.Interfaces;

public interface IAttendanceService
{
    Task<AttendanceResponseDto> CheckInAsync(long storeId, long userId, CheckInOutDto dto);
    Task<AttendanceResponseDto> CheckOutAsync(long storeId, long userId, CheckInOutDto dto);
    Task<List<AttendanceResponseDto>> GetAttendanceAsync(long storeId, long? employeeId, DateOnly? from, DateOnly? to);

    Task<List<AttendanceDeviceDto>> GetDevicesAsync(long storeId);
    Task<AttendanceDeviceDto> UpsertDeviceAsync(long storeId, long? deviceId, UpsertAttendanceDeviceDto dto);
    Task DeleteDeviceAsync(long storeId, long deviceId);
    Task<AttendanceSyncResultDto> SyncFromDeviceAsync(long storeId, long userId, long deviceId);
    Task<AttendanceSyncResultDto> ImportAttendanceRecordsAsync(long storeId, long userId, ImportAttendanceRecordsDto dto);

    Task<LeaveRequestResponseDto> CreateLeaveRequestAsync(long storeId, CreateLeaveRequestDto dto);
    Task<List<LeaveRequestResponseDto>> GetLeaveRequestsAsync(long storeId, long? employeeId);
    Task ApproveLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId);
    Task RejectLeaveRequestAsync(long storeId, long leaveRequestId, long approvedByUserId);
}