using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Zatca;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.Extensions.Options;
using System.Security.Cryptography.X509Certificates;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public class ZatcaService : IZatcaService
{
    private readonly AppDbContext _context;
    private readonly ZatcaClient _client;
    private readonly IOptions<ZatcaSettings> _settings;

    public ZatcaService(AppDbContext context, ZatcaClient client, IOptions<ZatcaSettings> settings)
    {
        _context = context;
        _client = client;
        _settings = settings;
    }

    public async Task<ZatcaStatusDto> GetStatusAsync()
    {
        var settings = _settings.Value;
        return new ZatcaStatusDto
        {
            Environment = settings.Environment,
            IsConfigured = !string.IsNullOrWhiteSpace(settings.BaseUrl),
            BaseUrl = settings.BaseUrl
        };
    }

    public async Task<ZatcaCredentialDto> GetCredentialAsync(long storeId)
    {
        var credential = await _context.ZatcaCredentials
            .FirstOrDefaultAsync(z => z.StoreId == storeId);

        if (credential == null)
        {
            return new ZatcaCredentialDto
            {
                StoreId = storeId,
                Status = ZatcaCredentialStatus.NotOnboarded.ToString(),
                VatNumber = (await _context.Stores.AsNoTracking().FirstOrDefaultAsync(s => s.Id == storeId))?.VatNumber
            };
        }

        return MapCredential(credential);
    }

    public async Task<ZatcaCredentialDto> OnboardAsync(long storeId, long userId, ZatcaOnboardDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var vatNumber = string.IsNullOrWhiteSpace(dto.VatNumber) ? store.VatNumber : dto.VatNumber?.Trim();
        if (string.IsNullOrWhiteSpace(vatNumber))
            throw new InvalidOperationException("الرقم الضريبي (VAT Number) مطلوب لتسجيل الجهاز لدى زاتكا");

        if (string.IsNullOrWhiteSpace(dto.Otp))
            throw new InvalidOperationException("كود OTP من بوابة الفاتورة الإلكترونية مطلوب لتسجيل الجهاز");

        var complianceRequestId = string.IsNullOrWhiteSpace(dto.ComplianceRequestId) ? null : dto.ComplianceRequestId.Trim();
        var complianceRequestSecret = string.IsNullOrWhiteSpace(dto.ComplianceRequestSecret) ? null : dto.ComplianceRequestSecret.Trim();

        var credential = await _context.ZatcaCredentials.FirstOrDefaultAsync(z => z.StoreId == storeId);
        if (credential == null)
        {
            credential = new ZatcaCredential { StoreId = storeId };
            _context.ZatcaCredentials.Add(credential);
        }

        complianceRequestId ??= credential.ComplianceRequestId;
        complianceRequestSecret ??= credential.ComplianceRequestSecret;

        if (string.IsNullOrWhiteSpace(complianceRequestId) || string.IsNullOrWhiteSpace(complianceRequestSecret))
            throw new InvalidOperationException(
                "بيانات طلب الالتزام (Compliance Request ID/Secret) مطلوبة — تُستخرج من حسابك في بوابة الفاتورة الإلكترونية (Fatoora Portal)");

        var isRenewal = !string.IsNullOrWhiteSpace(credential.ProductionCsid);

        var serialNumber = BuildSerialNumber(vatNumber);
        var (csrBase64, privateKeyPem) = ZatcaCsrBuilder.GenerateCsr(
            vatNumber,
            string.IsNullOrWhiteSpace(_settings.Value.OrganizationName) ? store.StoreName : _settings.Value.OrganizationName,
            _settings.Value.OrganizationUnit,
            serialNumber);

        ZatcaComplianceResponse response;
        try
        {
            response = await _client.ComplianceOnboardAsync(
                csrBase64,
                vatNumber,
                dto.Otp.Trim(),
                _settings.Value.SolutionName,
                complianceRequestId,
                complianceRequestSecret,
                isProductionRenewal: isRenewal);
        }
        catch (Exception ex)
        {
            credential.Status = ZatcaCredentialStatus.Failed;
            credential.ErrorMessage = ex.Message;
            credential.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw;
        }

        credential.VatNumber = vatNumber;
        credential.Otp = dto.Otp.Trim();
        credential.ComplianceRequestId = complianceRequestId;
        credential.ComplianceRequestSecret = complianceRequestSecret;
        credential.ProductionCsid = response.BinarySecurityToken;
        credential.CsidSecret = response.Secret;
        credential.CsidPrivateKey = privateKeyPem;
        credential.ProductionUuid = response.RequestId;
        credential.SolutionName = _settings.Value.SolutionName;
        credential.Status = ZatcaCredentialStatus.ProductionOnboarded;
        credential.ErrorMessage = null;
        credential.OnboardedAt = DateTime.UtcNow;
        credential.IssuedAt = DateTime.UtcNow;
        credential.UpdatedAt = DateTime.UtcNow;

        try
        {
            using var cert = new X509Certificate2(Convert.FromBase64String(response.BinarySecurityToken!));
            credential.CsidCertificate = cert.ExportCertificatePem();
            credential.CsidExpiresAt = cert.NotAfter;
        }
        catch
        {
        }

        await _context.SaveChangesAsync();

        return MapCredential(credential);
    }

    public async Task<ZatcaSubmitResultDto> SubmitInvoiceAsync(long storeId, long userId, long invoiceId, bool forceReporting = false, string? buyerVatNumber = null)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        if (string.IsNullOrWhiteSpace(store.VatNumber))
            throw new InvalidOperationException("المتجر غير مسجّل ضريبيًا — أضف الرقم الضريبي أولًا من إعدادات المتجر");

        var invoice = await _context.Invoices
            .Include(i => i.Items)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.StoreId == storeId)
            ?? throw new InvalidOperationException("الفاتورة غير موجودة");

        if (invoice.InvoiceType != InvoiceType.Sales)
            throw new InvalidOperationException("يُرسَل للفاتورة الإلكترونية فواتير البيع فقط");

        var credential = await _context.ZatcaCredentials.FirstOrDefaultAsync(z => z.StoreId == storeId);
        if (credential == null || credential.Status != ZatcaCredentialStatus.ProductionOnboarded
            || string.IsNullOrWhiteSpace(credential.ProductionCsid)
            || string.IsNullOrWhiteSpace(credential.CsidSecret)
            || string.IsNullOrWhiteSpace(credential.CsidPrivateKey))
            throw new InvalidOperationException("المتجر غير مسجّل لدى زاتكا بعد — نفّذ تسجيل الجهاز (Onboarding) أولًا");

        var unsignedXml = ZatcaXmlBuilder.BuildInvoiceXml(store, invoice, forceReporting, buyerVatNumber);
        var signatureResult = ZatcaSigner.Sign(unsignedXml, credential.CsidPrivateKey, credential.ProductionCsid);

        var invoiceDate = invoice.InvoiceDate.ToDateTime(TimeOnly.MinValue);
        var qrBase64 = ZatcaQrHelper.BuildSignedQrBase64(
            store.StoreName,
            store.VatNumber,
            invoiceDate,
            invoice.TotalAmount,
            invoice.TaxAmount,
            signatureResult.InvoiceHash,
            signatureResult.SignatureValueBase64);

        var uuid = invoice.ZatcaUuid ?? Guid.NewGuid().ToString("N").ToUpperInvariant();
        var endpointPath = forceReporting ? "/invoices/reporting/single" : "/invoices/clearance/single";

        ZatcaSubmissionResponse response;
        try
        {
            response = await _client.SubmitInvoiceAsync(
                endpointPath,
                Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(signatureResult.SignedXml)),
                signatureResult.InvoiceHash,
                uuid,
                credential.ProductionCsid,
                credential.CsidSecret);
        }
        catch (Exception ex)
        {
            invoice.ZatcaStatus = ZatcaInvoiceStatus.Failed;
            invoice.ZatcaUuid = uuid;
            invoice.ZatcaValidationResults = ex.Message;
            invoice.ZatcaSubmissionDateTime = DateTime.UtcNow;
            invoice.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            throw;
        }

        var reportingStatus = !string.IsNullOrWhiteSpace(response.ReportingStatus)
            ? response.ReportingStatus
            : !string.IsNullOrWhiteSpace(response.ClearingStatus)
                ? response.ClearingStatus
                : response.Status ?? string.Empty;

        var success = reportingStatus.Contains("CLEARED", StringComparison.OrdinalIgnoreCase)
            || reportingStatus.Contains("REPORTED", StringComparison.OrdinalIgnoreCase);

        invoice.ZatcaStatus = success
            ? (forceReporting ? ZatcaInvoiceStatus.Reported : ZatcaInvoiceStatus.Cleared)
            : ZatcaInvoiceStatus.Failed;
        invoice.ZatcaUuid = uuid;
        invoice.ZatcaReportingStatus = reportingStatus;
        invoice.ZatcaValidationResults = BuildValidationText(response);
        invoice.ZatcaHash = signatureResult.InvoiceHash;
        invoice.ZatcaSignedXml = signatureResult.SignedXml;
        invoice.ZatcaQrBase64 = !string.IsNullOrWhiteSpace(response.Qr) ? response.Qr : qrBase64;
        invoice.ZatcaSubmissionDateTime = DateTime.UtcNow;
        invoice.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new ZatcaSubmitResultDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Success = success,
            Message = success
                ? $"تم إرسال الفاتورة لزاتكا بنجاح ({reportingStatus})"
                : $"زاتكا استلمت الفاتورة بحالة غير مؤكدة: {reportingStatus}",
            Status = invoice.ZatcaStatus.ToString(),
            Uuid = uuid,
            ReportingStatus = reportingStatus,
            ValidationResults = invoice.ZatcaValidationResults,
            Hash = signatureResult.InvoiceHash,
            QrBase64 = invoice.ZatcaQrBase64,
            SubmissionDateTime = invoice.ZatcaSubmissionDateTime
        };
    }

    public async Task<ZatcaInvoiceStatusDto?> GetInvoiceStatusAsync(long storeId, long invoiceId)
    {
        var invoice = await _context.Invoices
            .AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.StoreId == storeId);
        if (invoice == null) return null;

        return new ZatcaInvoiceStatusDto
        {
            Id = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Status = invoice.ZatcaStatus.ToString(),
            Uuid = invoice.ZatcaUuid,
            ReportingStatus = invoice.ZatcaReportingStatus,
            ValidationResults = invoice.ZatcaValidationResults,
            Hash = invoice.ZatcaHash,
            QrBase64 = invoice.ZatcaQrBase64,
            SubmissionDateTime = invoice.ZatcaSubmissionDateTime
        };
    }

    public async Task<ZatcaSubmitResultDto> VerifyInvoiceAsync(long storeId, long invoiceId)
    {
        var invoice = await _context.Invoices
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.StoreId == storeId)
            ?? throw new InvalidOperationException("الفاتورة غير موجودة");

        if (string.IsNullOrWhiteSpace(invoice.ZatcaUuid))
            throw new InvalidOperationException("هذه الفاتورة لم تُرسل إلى زاتكا بعد — لا يمكن التحقق منها");

        var credential = await _context.ZatcaCredentials.FirstOrDefaultAsync(z => z.StoreId == storeId);
        if (credential == null || string.IsNullOrWhiteSpace(credential.ProductionCsid)
            || string.IsNullOrWhiteSpace(credential.CsidSecret))
            throw new InvalidOperationException("المتجر غير مسجّل لدى زاتكا بعد — نفّذ تسجيل الجهاز (Onboarding) أولًا");

        ZatcaSubmissionResponse response;
        try
        {
            response = await _client.VerifyInvoiceAsync(
                invoice.ZatcaUuid,
                credential.ProductionCsid,
                credential.CsidSecret);
        }
        catch (Exception ex)
        {
            return new ZatcaSubmitResultDto
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber,
                Success = false,
                Message = ex.Message,
                Status = invoice.ZatcaStatus.ToString(),
                Uuid = invoice.ZatcaUuid
            };
        }

        var reportingStatus = !string.IsNullOrWhiteSpace(response.ReportingStatus)
            ? response.ReportingStatus
            : !string.IsNullOrWhiteSpace(response.ClearingStatus)
                ? response.ClearingStatus
                : response.Status ?? string.Empty;

        var success = reportingStatus.Contains("CLEARED", StringComparison.OrdinalIgnoreCase)
            || reportingStatus.Contains("REPORTED", StringComparison.OrdinalIgnoreCase);

        invoice.ZatcaReportingStatus = reportingStatus;
        invoice.ZatcaValidationResults = BuildValidationText(response);
        invoice.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new ZatcaSubmitResultDto
        {
            InvoiceId = invoice.Id,
            InvoiceNumber = invoice.InvoiceNumber,
            Success = success,
            Message = success
                ? $"تم التحقق من الفاتورة لدى زاتكا بنجاح ({reportingStatus})"
                : $"زاتكا تُظهر الفاتورة بحالة: {reportingStatus}",
            Status = invoice.ZatcaStatus.ToString(),
            Uuid = invoice.ZatcaUuid,
            ReportingStatus = reportingStatus,
            ValidationResults = invoice.ZatcaValidationResults,
            Hash = invoice.ZatcaHash,
            QrBase64 = invoice.ZatcaQrBase64,
            SubmissionDateTime = invoice.ZatcaSubmissionDateTime
        };
    }

    private static ZatcaCredentialDto MapCredential(ZatcaCredential credential) => new()
    {
        StoreId = credential.StoreId,
        Status = credential.Status.ToString(),
        VatNumber = credential.VatNumber,
        ComplianceUuid = credential.ComplianceUuid,
        ProductionUuid = credential.ProductionUuid,
        IssuedAt = credential.IssuedAt,
        CsidExpiresAt = credential.CsidExpiresAt,
        ErrorMessage = credential.ErrorMessage,
        ProductionCsid = credential.ProductionCsid
    };

    private static string BuildSerialNumber(string vatNumber) =>
        $"+{new string(vatNumber.Where(char.IsDigit).ToArray())}-{DateTime.UtcNow:yyyyMMdd}-1";

    private static string BuildValidationText(ZatcaSubmissionResponse response)
    {
        var results = response.ValidationResults;
        if (results == null)
            return response.RawResponse ?? string.Empty;

        var parts = new List<string>();
        if (results.Status != null) parts.Add($"status: {results.Status}");
        if (results.WarningMessages is { Count: > 0 }) parts.Add($"warnings: {string.Join("; ", results.WarningMessages)}");
        if (results.ErrorMessages is { Count: > 0 }) parts.Add($"errors: {string.Join("; ", results.ErrorMessages)}");
        return string.Join(" | ", parts);
    }
}
