using System.ComponentModel.DataAnnotations;

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
    public string? SuspensionReason { get; set; }               
    public DateTime? SuspendedAt { get; set; }                  
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
    public string? SuspensionReason { get; set; }
    public DateTime? SuspendedAt { get; set; }
}

public class ReviewMerchantAccountDto
{
    public bool Approve { get; set; }    public string? RejectionReason { get; set; }
}

public class SuspendMerchantAccountDto
{
    public string? Reason { get; set; }
}

public class UpsertMerchantAccountDto
{
    [Required(ErrorMessage = "اسم العلامة التجارية مطلوب")]
    [StringLength(200, ErrorMessage = "اسم العلامة التجارية طويل جدًا")]
    public string BrandName { get; set; } = string.Empty;

    [Required(ErrorMessage = "رابط الموقع الإلكتروني مطلوب")]
    [Url(ErrorMessage = "الرابط يجب أن يبدأ بـ http:// أو https://")]
    public string WebsiteUrl { get; set; } = string.Empty;

    [Required(ErrorMessage = "الاسم القانوني مطلوب")]
    [StringLength(300, ErrorMessage = "الاسم القانوني طويل جدًا")]
    public string LegalName { get; set; } = string.Empty;

    [Required(ErrorMessage = "نوع الترخيص مطلوب")]
    public string LicenseType { get; set; } = string.Empty;

    [Required(ErrorMessage = "رقم الترخيص مطلوب")]
    public string LicenseNumber { get; set; } = string.Empty;

    [Required(ErrorMessage = "الاسم الأول مطلوب")]
    public string OwnerFirstName { get; set; } = string.Empty;

    public string? OwnerMiddleName { get; set; }

    [Required(ErrorMessage = "الاسم الأخير مطلوب")]
    public string OwnerLastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    public string OwnerEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "رمز الدولة مطلوب")]
    [RegularExpression(@"^\d{1,4}$", ErrorMessage = "رمز الدولة يجب أن يتكون من أرقام فقط")]
    public string OwnerCountryCode { get; set; } = string.Empty;

    [Required(ErrorMessage = "رقم الجوال مطلوب")]
    [RegularExpression(@"^\d{6,15}$", ErrorMessage = "رقم الجوال يجب أن يحتوي على أرقام فقط")]
    public string OwnerPhone { get; set; } = string.Empty;

    [Required(ErrorMessage = "دولة العنوان مطلوبة")]
    public string AddressCountry { get; set; } = string.Empty;

    [Required(ErrorMessage = "مدينة العنوان مطلوبة")]
    public string AddressCity { get; set; } = string.Empty;

    [Required(ErrorMessage = "تاريخ الميلاد مطلوب")]
    public DateTime? BirthDate { get; set; }

    public string? NationalIdNumber { get; set; }
}

/// <summary>الحالة الموحدة لاعتماد التاجر (حساب التاجر + مستندات التوثيق معًا).</summary>
public class MerchantKycStatusDto
{
    public long StoreId { get; set; }
    public string MerchantAccountStatus { get; set; } = "NotSubmitted";
    public string VerificationStatus { get; set; } = "NotSubmitted";
    public bool IsApproved { get; set; }
}