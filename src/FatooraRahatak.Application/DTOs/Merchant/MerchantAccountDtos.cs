namespace FatooraRahatak.Application.DTOs.Merchant;

public class MerchantAccountDto
{
    public long Id { get; set; }
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

    public bool IsSubmitted { get; set; }
    public DateTime? SubmittedAt { get; set; }

    // حالة المراجعة الإدارية (KYC)
    public string Status { get; set; } = "NotSubmitted";
    public string? RejectionReason { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByName { get; set; }
}

public class AdminMerchantAccountDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;

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
    public string OwnerCountryCode { get; set; } = string.Empty;
    public string OwnerPhone { get; set; } = string.Empty;
    public string AddressCountry { get; set; } = string.Empty;
    public string AddressCity { get; set; } = string.Empty;
    public DateTime? BirthDate { get; set; }
    public string? NationalIdNumber { get; set; }

    public string Status { get; set; } = "NotSubmitted";
    public string? RejectionReason { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByName { get; set; }
}

public class ReviewMerchantAccountDto
{
    public bool Approve { get; set; }
    public string? RejectionReason { get; set; }
}

public class UpsertMerchantAccountDto
{
    public string BrandName { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    public string LegalName { get; set; } = string.Empty;
    public string LicenseType { get; set; } = string.Empty;
    public string LicenseNumber { get; set; } = string.Empty;
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
}