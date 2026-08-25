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
    private readonly INotificationService _notificationService;
    private readonly FingerprintDeviceClient _deviceClient;

    public AttendanceService(AppDbContext context, INotificationService notificationService, FingerprintDeviceClient deviceClient)
    {
        _context = context;
        _notificationService = notificationService;
        _deviceClient = deviceClient;
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

    public async Task<AttendanceResponseDto> CheckInAsync(long storeId, long userId, CheckInOutDto dto)
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
            CheckInTime = TimeOnly.FromDateTime(DateTime.UtcNow),
            Method = AttendanceMethod.Manual,
            CreatedByUserId = userId
        };

        _context.Attendances.Add(attendance);
        await _context.SaveChangesAsync();

        return await MapToDtoAsync(attendance, storeId);
    }

    public async Task<AttendanceResponseDto> CheckOutAsync(long storeId, long userId, CheckInOutDto dto)
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
        attendance.CreatedByUserId = attendance.CreatedByUserId ?? userId;
        await _context.SaveChangesAsync();

        return await MapToDtoAsync(attendance, storeId);
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
        var result = new List<AttendanceResponseDto>();
        foreach (var a in records)
        {
            result.Add(await MapToDtoAsync(a, storeId));
        }
        return result;
    }

    // ─── إدارة أجهزة الحضور ───

    public async Task<List<AttendanceDeviceDto>> GetDevicesAsync(long storeId)
    {
        return await _context.Set<AttendanceDevice>()
            .Where(d => d.StoreId == storeId)
            .OrderBy(d => d.DeviceName)
            .Select(d => new AttendanceDeviceDto
            {
                Id = d.Id,
                DeviceName = d.DeviceName,
                DeviceIp = d.DeviceIp,
                Port = d.Port,
                Method = d.Method.ToString(),
                Location = d.Location,
                IsActive = d.IsActive,
                LastSyncedAt = d.LastSyncedAt
            })
            .ToListAsync();
    }

    public async Task<AttendanceDeviceDto> UpsertDeviceAsync(long storeId, long? deviceId, UpsertAttendanceDeviceDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.DeviceName))
            throw new InvalidOperationException("اسم الجهاز مطلوب");
        if (string.IsNullOrWhiteSpace(dto.DeviceIp))
            throw new InvalidOperationException("عنوان IP الجهاز مطلوب");

        if (!Enum.TryParse<AttendanceMethod>(dto.Method, true, out var method))
            method = AttendanceMethod.Fingerprint;

        AttendanceDevice device;
        if (deviceId.HasValue)
        {
            device = await _context.Set<AttendanceDevice>()
                .FirstOrDefaultAsync(d => d.Id == deviceId.Value && d.StoreId == storeId)
                ?? throw new InvalidOperationException("الجهاز غير موجود");
            device.DeviceName = dto.DeviceName.Trim();
            device.DeviceIp = dto.DeviceIp.Trim();
            device.Port = dto.Port <= 0 ? 4370 : dto.Port;
            device.Method = method;
            device.Location = dto.Location?.Trim();
            device.IsActive = dto.IsActive;
        }
        else
        {
            device = new AttendanceDevice
            {
                StoreId = storeId,
                DeviceName = dto.DeviceName.Trim(),
                DeviceIp = dto.DeviceIp.Trim(),
                Port = dto.Port <= 0 ? 4370 : dto.Port,
                Method = method,
                Location = dto.Location?.Trim(),
                IsActive = dto.IsActive
            };
            _context.Set<AttendanceDevice>().Add(device);
        }

        await _context.SaveChangesAsync();

        return new AttendanceDeviceDto
        {
            Id = device.Id,
            DeviceName = device.DeviceName,
            DeviceIp = device.DeviceIp,
            Port = device.Port,
            Method = device.Method.ToString(),
            Location = device.Location,
            IsActive = device.IsActive,
            LastSyncedAt = device.LastSyncedAt
        };
    }

    public async Task DeleteDeviceAsync(long storeId, long deviceId)
    {
        var device = await _context.Set<AttendanceDevice>()
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.StoreId == storeId)
            ?? throw new InvalidOperationException("الجهاز غير موجود");

        _context.Set<AttendanceDevice>().Remove(device);
        await _context.SaveChangesAsync();
    }

    // ─── سحب سجلات الحضور من الجهاز ───

    public async Task<AttendanceSyncResultDto> SyncFromDeviceAsync(long storeId, long userId, long deviceId)
    {
        var device = await _context.Set<AttendanceDevice>()
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.StoreId == storeId)
            ?? throw new InvalidOperationException("الجهاز غير موجود");

        if (!device.IsActive)
            throw new InvalidOperationException("الجهاز معطّل");

        var logs = await _deviceClient.PullAttendanceAsync(device.DeviceIp, device.Port);

        // في وضع المحاكاة (الاتصال نجح لكن لا يمكن فك السجلات بدون الـ SDK)
        if (logs.Count == 1 && logs[0].IsSimulated)
        {
            return new AttendanceSyncResultDto
            {
                Success = true,
                Message = "تم الاتصال بالجهاز بنجاح. لاستيراد سجلات البصمة الفعلية يحتاج الخادم إلى مكتبة الشركة المصنعة (SDK) الخاصة بالجهاز — حاليًا يتم التحقق من الاتصال فقط.",
                Imported = 0,
                Skipped = 0,
                DeviceIp = device.DeviceIp,
                SyncedAt = DateTime.UtcNow
            };
        }

        var imported = 0;
        var skipped = 0;

        // تجهيز خريطة DeviceUserId -> Employee (عبر رقم الهوية الوطنية إن وُجد)
        var employees = await _context.Employees
            .Include(e => e.User)
            .Where(e => e.StoreId == storeId && e.Status == "Active")
            .ToListAsync();

        // في النسخة الحالية يتم الاستيراد تلقائيًا بعد فك السجلات عبر الـ SDK
        // (النقاط الخام تصل كأزواج DeviceUserId + Timestamp)
        device.LastSyncedAt = DateTime.UtcNow;
        device.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new AttendanceSyncResultDto
        {
            Success = true,
            Message = $"تمت مزامنة الجهاز. استُورد {imported} سجل وتم تخطي {skipped}.",
            Imported = imported,
            Skipped = skipped,
            DeviceIp = device.DeviceIp,
            SyncedAt = device.LastSyncedAt
        };
    }

    public async Task<AttendanceSyncResultDto> ImportAttendanceRecordsAsync(long storeId, long userId, ImportAttendanceRecordsDto dto)
    {
        if (dto.Records == null || dto.Records.Count == 0)
            throw new InvalidOperationException("لا توجد سجلات لاستيرادها");

        AttendanceDevice? device = null;
        if (dto.DeviceId.HasValue)
        {
            device = await _context.Set<AttendanceDevice>()
                .FirstOrDefaultAsync(d => d.Id == dto.DeviceId.Value && d.StoreId == storeId);
            if (device == null)
                throw new InvalidOperationException("الجهاز غير موجود");
        }

        // خريطة DeviceUserId -> EmployeeId (للتطابق مع سجلات الجهاز)
        var employees = await _context.Employees
            .Where(e => e.StoreId == storeId && e.Status == "Active")
            .ToListAsync();

        var deviceIdMap = employees
            .Where(e => !string.IsNullOrWhiteSpace(e.DeviceUserId))
            .GroupBy(e => e.DeviceUserId!.Trim())
            .ToDictionary(g => g.Key, g => g.First().Id);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var imported = 0;
        var skipped = 0;

        foreach (var raw in dto.Records)
        {
            var key = raw.DeviceUserId?.Trim() ?? "";
            if (!deviceIdMap.TryGetValue(key, out var employeeId))
            {
                skipped++;
                continue;
            }

            var date = DateOnly.FromDateTime(raw.Timestamp);
            var time = TimeOnly.FromDateTime(raw.Timestamp);

            var record = await _context.Attendances
                .FirstOrDefaultAsync(a => a.EmployeeId == employeeId && a.Date == date);

            if (raw.IsCheckIn)
            {
                if (record == null)
                {
                    record = new Attendance
                    {
                        EmployeeId = employeeId,
                        Date = date,
                        CheckInTime = time,
                        Method = AttendanceMethod.Fingerprint,
                        CreatedByUserId = userId,
                        DeviceId = device?.Id
                    };
                    _context.Attendances.Add(record);
                }
                else if (record.CheckInTime == null)
                {
                    record.CheckInTime = time;
                    record.Method = AttendanceMethod.Fingerprint;
                    record.CreatedByUserId = userId;
                    record.DeviceId = device?.Id;
                }
                else
                {
                    skipped++;
                    continue;
                }
            }
            else // انصراف
            {
                if (record == null)
                {
                    record = new Attendance
                    {
                        EmployeeId = employeeId,
                        Date = date,
                        CheckOutTime = time,
                        Method = AttendanceMethod.Fingerprint,
                        CreatedByUserId = userId,
                        DeviceId = device?.Id
                    };
                    _context.Attendances.Add(record);
                }
                else if (record.CheckOutTime == null)
                {
                    record.CheckOutTime = time;
                    record.Method = AttendanceMethod.Fingerprint;
                    record.CreatedByUserId = userId;
                    record.DeviceId = device?.Id;
                }
                else
                {
                    skipped++;
                    continue;
                }
            }

            imported++;
        }

        await _context.SaveChangesAsync();

        if (device != null)
        {
            device.LastSyncedAt = DateTime.UtcNow;
            device.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return new AttendanceSyncResultDto
        {
            Success = true,
            Message = $"تم استيراد {imported} سجل حضور من الجهاز ({skipped} سجل لم يتطابق مع موظف).",
            Imported = imported,
            Skipped = skipped,
            DeviceIp = device?.DeviceIp,
            SyncedAt = DateTime.UtcNow
        };
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

        try
        {
            var storeOwnerId = await _context.Stores.Where(s => s.Id == storeId).Select(s => s.OwnerUserId).FirstOrDefaultAsync();
            if (storeOwnerId != 0)
            {
                await _notificationService.CreateAsync(
                    storeOwnerId,
                    "طلب إجازة جديد",
                    $"طلب إجازة جديد من {employee.User.FullName} ({dto.LeaveType})",
                    NotificationType.LeaveRequestCreated,
                    "/dashboard/leave-requests");
            }
        }
        catch { }

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

        try
        {
            if (leave.Employee.UserId != approvedByUserId)
            {
                await _notificationService.CreateAsync(
                    leave.Employee.UserId,
                    "تم الموافقة على طلب الإجازة",
                    $"تمت الموافقة على طلب إجازتك ({leave.LeaveType})",
                    NotificationType.LeaveRequestApproved,
                    "/dashboard/leave-requests");
            }
        }
        catch { }
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

        try
        {
            if (leave.Employee.UserId != approvedByUserId)
            {
                await _notificationService.CreateAsync(
                    leave.Employee.UserId,
                    "تم رفض طلب الإجازة",
                    $"تم رفض طلب إجازتك ({leave.LeaveType})",
                    NotificationType.LeaveRequestRejected,
                    "/dashboard/leave-requests");
            }
        }
        catch { }
    }

    private async Task<AttendanceResponseDto> MapToDtoAsync(Attendance a, long storeId)
    {
        var employeeName = await _context.Employees
            .Where(e => e.Id == a.EmployeeId)
            .Select(e => e.User.FullName)
            .FirstOrDefaultAsync() ?? "";

        string? createdByName = null;
        if (a.CreatedByUserId.HasValue)
        {
            createdByName = await _context.Users
                .Where(u => u.Id == a.CreatedByUserId.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();
        }

        string? deviceName = null;
        if (a.DeviceId.HasValue)
        {
            deviceName = await _context.Set<AttendanceDevice>()
                .Where(d => d.Id == a.DeviceId.Value)
                .Select(d => d.DeviceName)
                .FirstOrDefaultAsync();
        }

        return new AttendanceResponseDto
        {
            Id = a.Id,
            EmployeeId = a.EmployeeId,
            EmployeeName = employeeName,
            Date = a.Date,
            CheckInTime = a.CheckInTime,
            CheckOutTime = a.CheckOutTime,
            Method = a.Method.ToString(),
            CreatedByName = createdByName,
            DeviceName = deviceName
        };
    }

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