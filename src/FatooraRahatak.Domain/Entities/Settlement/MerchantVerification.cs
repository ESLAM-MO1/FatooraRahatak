using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Settlement;

/// <summary>ملف توثيق صاحب المتجر (حساب تاجر / مستندات) المقدم للمنصة للاعتماد.</summary>
public class MerchantVerification : BaseEntity
{
    public long StoreId { get; set; }
    public MerchantVerificationStatus Status { get; set; } = MerchantVerificationStatus.NotSubmitted;
    public string? RejectionReason { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public long? ReviewedByUserId { get; set; }

    public Store Store { get; set; } = null!;
    public User? ReviewedBy { get; set; }
    public ICollection<MerchantDocument> Documents { get; set; } = new List<MerchantDocument>();
}

public enum MerchantVerificationStatus
{
    NotSubmitted = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3
}

public class MerchantDocument : BaseEntity
{
    public long VerificationId { get; set; }
    public string DocumentType { get; set; } = "Other"; // CommercialRegister / IdCard / License / VatCertificate / Other
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;

    public MerchantVerification Verification { get; set; } = null!;
}