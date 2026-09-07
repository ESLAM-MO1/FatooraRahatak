using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Employees;

public class AttendanceDeviceDto
{
    public long Id { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceIp { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Method { get; set; } = "Fingerprint";
    public string? Location { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastSyncedAt { get; set; }
}

public class UpsertAttendanceDeviceDto
{
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceIp { get; set; } = string.Empty;
    public int Port { get; set; } = 4370;
    public string Method { get; set; } = "Fingerprint";
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AttendanceSyncResultDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int Imported { get; set; }
    public int Skipped { get; set; }
    public string? DeviceIp { get; set; }
    public DateTime? SyncedAt { get; set; }
}

public class AttendanceDeviceRawLogDto
{
    public string DeviceUserId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public bool IsCheckIn { get; set; }
}

public class ImportAttendanceRecordsDto
{
    public long? DeviceId { get; set; }
    public List<AttendanceDeviceRawLogDto> Records { get; set; } = new();
}