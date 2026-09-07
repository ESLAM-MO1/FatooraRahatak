using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Employees;

/// <summary>
/// جهاز حضور (بصمة / NFC / وجه) مرتبط بمتجر ويتصل به عبر الشبكة (IP).
/// </summary>
public class AttendanceDevice : BaseEntity
{
    public long StoreId { get; set; }
    public string DeviceName { get; set; } = string.Empty;
    public string DeviceIp { get; set; } = string.Empty;
    public int Port { get; set; } = 4370;
    public AttendanceMethod Method { get; set; } = AttendanceMethod.Fingerprint;
    public string? Location { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncedAt { get; set; }

    public Store Store { get; set; } = null!;
}
