namespace FatooraRahatak.Application.DTOs.Zatca;

public class ZatcaOnboardDto
{
    public string? VatNumber { get; set; }
    public string? Otp { get; set; }
    public string? ComplianceRequestId { get; set; }
    public string? ComplianceRequestSecret { get; set; }
}

public class ZatcaCredentialDto
{
    public long StoreId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? VatNumber { get; set; }
    public string? ComplianceUuid { get; set; }
    public string? ProductionUuid { get; set; }
    public DateTime? IssuedAt { get; set; }
    public DateTime? CsidExpiresAt { get; set; }
    public string? ErrorMessage { get; set; }
    public bool HasCsid => !string.IsNullOrWhiteSpace(ProductionCsid);
    public string? ProductionCsid { get; set; }
}

public class ZatcaSubmitInvoiceDto
{
    public long InvoiceId { get; set; }
    public bool ForceReporting { get; set; }
    public string? BuyerVatNumber { get; set; }
}

public class ZatcaSubmitResultDto
{
    public long InvoiceId { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Uuid { get; set; }
    public string? ReportingStatus { get; set; }
    public string? ValidationResults { get; set; }
    public string? Hash { get; set; }
    public string? QrBase64 { get; set; }
    public DateTime? SubmissionDateTime { get; set; }
}

public class ZatcaInvoiceStatusDto
{
    public long Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Uuid { get; set; }
    public string? ReportingStatus { get; set; }
    public string? ValidationResults { get; set; }
    public string? Hash { get; set; }
    public string? QrBase64 { get; set; }
    public DateTime? SubmissionDateTime { get; set; }
}

public class ZatcaStatusDto
{
    public string Environment { get; set; } = string.Empty;
    public bool IsConfigured { get; set; }
    public string? BaseUrl { get; set; }
}
