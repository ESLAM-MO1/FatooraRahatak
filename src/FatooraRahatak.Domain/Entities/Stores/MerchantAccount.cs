using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Stores;

public class MerchantAccount : BaseEntity
{
    public long StoreId { get; set; }

    // معلومات العلامة التجارية
    public string BrandName { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    public string? LogoPath { get; set; }

    // بيانات الكيان القانوني
    public string LegalName { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;

    // بيانات المسؤول الرئيسي
    public string OwnerFirstName { get; set; } = string.Empty;
    public string? OwnerMiddleName { get; set; }
    public string OwnerLastName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string OwnerCountryCode { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string AddressCountry { get; set; } = string.Empty;
    public string AddressCity { get; set; } = string.Empty;
    public DateTime? BirthDate { get; set; }
    public string? NationalIdNumber { get; set; }

    public bool IsSubmitted { get; set; } = false;
    public DateTime? SubmittedAt { get; set; }

    // حالة المراجعة الإدارية (KYC)
    public MerchantAccountStatus Status { get; set; } = MerchantAccountStatus.NotSubmitted;
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public long? ReviewedByUserId { get; set; }
    public string? SuspensionReason { get; set; }
    public DateTime? SuspendedAt { get; set; }

    public Store Store { get; set; } = null!;
    public User? ReviewedBy { get; set; }
}

public enum MerchantAccountStatus
{
    NotSubmitted = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    Suspended = 4
}