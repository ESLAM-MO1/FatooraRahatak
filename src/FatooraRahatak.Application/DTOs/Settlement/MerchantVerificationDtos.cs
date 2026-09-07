namespace FatooraRahatak.Application.DTOs.Settlement;

public class MerchantVerificationDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string Status { get; set; } = "NotSubmitted";
    public string? RejectionReason { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public List<MerchantDocumentDto> Documents { get; set; } = new();
}

public class MerchantDocumentDto
{
    public long Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public string? RejectReason { get; set; }
    public long? ReviewedByUserId { get; set; }
    public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class AdminVerificationDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string StoreName { get; set; } = string.Empty;
    public string StoreSlug { get; set; } = string.Empty;
    public string OwnerName { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Status { get; set; } = "NotSubmitted";
    public string? RejectionReason { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByName { get; set; }
    public List<MerchantDocumentDto> Documents { get; set; } = new();
}

public class CreateMerchantDocumentDto
{
    public string DocumentType { get; set; } = "Other";
}

/// <summary>بيانات تحميل ملف مستند توثيق محمي (لا يُقدَّم كملف ثابت عام).</summary>
public class MerchantDocumentFileDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string FilePath { get; set; } = string.Empty;
    public string AbsolutePath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = "application/octet-stream";
    public bool FileExists { get; set; }
}

public class ReviewVerificationDto
{
    public bool Approve { get; set; }
    public string? RejectionReason { get; set; }
}

public class ReviewDocumentDto
{
    public bool Approve { get; set; }
    public string? RejectReason { get; set; }
}