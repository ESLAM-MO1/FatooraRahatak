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

        var credential = await _context.ZatcaCredentials.FirstOrDefaultAsync(z => z.StoreId == storeId);
        if (credential == null)
        {
            credential = new ZatcaCredential { StoreId = storeId };
            _context.ZatcaCredentials.Add(credential);
        }

        var organizationName = string.IsNullOrWhiteSpace(_settings.Value.OrganizationName) ? store.StoreName : _settings.Value.OrganizationName;
        var egsSerialNumber = BuildEgsSerialNumber(storeId);
        var certificateTemplateName = ResolveCertificateTemplateName(_settings.Value.Environment);
        var (csrBase64, privateKeyPem) = ZatcaCsrBuilder.GenerateCsr(
            certificateTemplateName,
            organizationName,
            organizationName,
            _settings.Value.OrganizationUnit,
            vatNumber,
            egsSerialNumber,
            string.IsNullOrWhiteSpace(_settings.Value.InvoiceType) ? "1100" : _settings.Value.InvoiceType,
            string.IsNullOrWhiteSpace(store.ContactAddress) ? "Saudi Arabia" : store.ContactAddress,
            string.IsNullOrWhiteSpace(_settings.Value.BusinessCategory) ? "Retail" : _settings.Value.BusinessCategory);

        ZatcaComplianceResponse complianceResponse;
        ZatcaComplianceResponse productionResponse;
        try
        {
            // الخطوة 1: CSR + OTP فقط، بدون أي بيانات دخول -> شهادة تجريبية (Compliance CSID)
            complianceResponse = await _client.ComplianceOnboardAsync(csrBase64, dto.Otp.Trim());

            if (string.IsNullOrWhiteSpace(complianceResponse.RequestId))
                throw new InvalidOperationException("زاتكا لم تُرجع معرّف طلب الالتزام (Request ID) في رد الخطوة الأولى");

            // الخطوة 1.5 (إلزامية من زاتكا - BR-KSA وقواعد الـ Compliance Checks):
            // لازم نبعت نماذج فواتير تجريبية (Standard/Simplified × Invoice/CreditNote/DebitNote حسب InvoiceType)
            // وتتقبل من زاتكا الأول، قبل ما نطلب الشهادة النهائية - وإلا الطلب هيترفض بـ Missing-ComplianceSteps
            const string complianceBuyerVat = "300000000000003"; // رقم ضريبي وهمي واضح إنه تجريبي، للنماذج Standard بس
            foreach (var sample in GetRequiredComplianceSamples(_settings.Value.InvoiceType))
            {
                var sampleInvoice = new Invoice
                {
                    StoreId = storeId,
                    InvoiceType = InvoiceType.Sales,
                    InvoiceNumber = "COMPLIANCE-" + Guid.NewGuid().ToString("N")[..8].ToUpperInvariant(),
                    InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
                    PartyName = "عميل تجريبي - اختبار توافق",
                    PartyCity = "الرياض",
                    SubTotal = 100m,
                    DiscountAmount = 0m,
                    TaxAmount = 15m,
                    TotalAmount = 115m,
                    CreatedByUserId = userId,
                    Items = new List<InvoiceItem>
                    {
                        new InvoiceItem
                        {
                            ProductId = 0,
                            ProductNameSnapshot = "منتج اختبار التوافق",
                            ProductCodeSnapshot = "TEST-001",
                            Quantity = 1,
                            UnitPrice = 100m,
                            LineTotal = 100m,
                            DiscountAmount = 0m,
                            LineAfterDiscount = 100m
                        }
                    }
                };

                var sampleUuid = Guid.NewGuid().ToString();
                var isCreditOrDebit = sample.DocumentTypeCode != "388";

                var sampleXml = ZatcaXmlBuilder.BuildInvoiceXml(
                    store,
                    sampleInvoice,
                    sampleUuid,
                    icv: 1,
                    previousInvoiceHash: ZatcaQrHelper.FirstInvoicePih,
                    forceReporting: !sample.IsStandard,
                    buyerVatNumber: sample.IsStandard ? complianceBuyerVat : null,
                    documentTypeCode: sample.DocumentTypeCode,
                    billingReferenceInvoiceId: isCreditOrDebit ? sampleInvoice.InvoiceNumber : null,
                    issuanceReason: isCreditOrDebit ? "فاتورة اختبار توافق (Compliance Test) - لا تمثل معاملة تجارية حقيقية" : null);

                var sampleSignature = ZatcaSigner.Sign(sampleXml, privateKeyPem, complianceResponse.BinarySecurityToken!);

                var sampleQr = ZatcaQrHelper.BuildSignedQrTlvBase64(
                    organizationName,
                    vatNumber!,
                    DateTime.UtcNow,
                    sampleInvoice.TotalAmount,
                    sampleInvoice.TaxAmount,
                    sampleSignature.InvoiceHash,
                    sampleSignature.SignatureValueBase64);

                var sampleFinalXml = ZatcaXmlBuilder.InsertQrReference(sampleSignature.SignedXml, sampleQr);

                try
                {
                    await _client.SubmitInvoiceAsync(
                        "/compliance/invoices",
                        Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(sampleFinalXml)),
                        sampleSignature.InvoiceHash,
                        sampleUuid,
                        complianceResponse.BinarySecurityToken!,
                        complianceResponse.Secret!);
                }
                catch (Exception ex)
                {
                    throw new InvalidOperationException($"فشل اختبار التوافق (Compliance Check) لنوع '{sample.Description}': {ex.Message}");
                }
            }

            // الخطوة 2: نستخدم الشهادة التجريبية كبيانات دخول -> الشهادة النهائية (Production CSID)
            productionResponse = await _client.ProductionOnboardAsync(
                complianceResponse.RequestId!,
                complianceResponse.BinarySecurityToken!,
                complianceResponse.Secret!);
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
        credential.ComplianceRequestId = complianceResponse.RequestId;
        credential.ComplianceUuid = complianceResponse.BinarySecurityToken;
        credential.ComplianceRequestSecret = complianceResponse.Secret;
        credential.ProductionCsid = productionResponse.BinarySecurityToken;
        credential.CsidSecret = productionResponse.Secret;
        credential.CsidPrivateKey = privateKeyPem;
        credential.ProductionUuid = productionResponse.RequestId;
        credential.SolutionName = _settings.Value.SolutionName;
        credential.Status = ZatcaCredentialStatus.ProductionOnboarded;
        credential.ErrorMessage = null;
        credential.OnboardedAt = DateTime.UtcNow;
        credential.IssuedAt = DateTime.UtcNow;
        credential.UpdatedAt = DateTime.UtcNow;

        try
        {
            using var cert = new X509Certificate2(Convert.FromBase64String(productionResponse.BinarySecurityToken!));
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

        var uuid = invoice.ZatcaUuid ?? Guid.NewGuid().ToString("N").ToUpperInvariant();

        // ⚠️ ملحوظة تزامن: القراءة والتحديث دول مش جوه transaction بقفل صف حقيقي (pessimistic lock)،
        // لأن جملة القفل بتختلف حسب نوع قاعدة البيانات (Postgres/SQL Server/MySQL) ومش عارف نوعها
        // عندك بالظبط. لو فاتورتين اتبعتوا لنفس المتجر في نفس اللحظة بالظبط، ممكن يحصل تضارب
        // في رقم الـ ICV. الحل الآمن دلوقتي: تتأكد إن إرسال الفواتير لكل متجر بيحصل واحدة ورا التانية
        // (queue أو lock على مستوى التطبيق)، أو نضيف قفل حقيقي بعد ما تقولي نوع قاعدة البيانات بالظبط.
        var lockedCredential = credential;

        var icv = lockedCredential.LastIcv + 1;
        var previousInvoiceHash = string.IsNullOrWhiteSpace(lockedCredential.LastInvoiceHash)
            ? ZatcaQrHelper.FirstInvoicePih
            : lockedCredential.LastInvoiceHash;

        var unsignedXml = ZatcaXmlBuilder.BuildInvoiceXml(store, invoice, uuid, icv, previousInvoiceHash, forceReporting, buyerVatNumber);
        var signatureResult = ZatcaSigner.Sign(unsignedXml, credential.CsidPrivateKey, credential.ProductionCsid);

        var invoiceDate = invoice.InvoiceDate.ToDateTime(TimeOnly.MinValue);

        var qrTlvBase64 = ZatcaQrHelper.BuildSignedQrTlvBase64(
            store.StoreName,
            store.VatNumber,
            invoiceDate,
            invoice.TotalAmount,
            invoice.TaxAmount,
            signatureResult.InvoiceHash,
            signatureResult.SignatureValueBase64);

        var finalSignedXml = ZatcaXmlBuilder.InsertQrReference(signatureResult.SignedXml, qrTlvBase64);

        var qrBase64 = ZatcaQrHelper.BuildSignedQrBase64(
            store.StoreName,
            store.VatNumber,
            invoiceDate,
            invoice.TotalAmount,
            invoice.TaxAmount,
            signatureResult.InvoiceHash,
            signatureResult.SignatureValueBase64);

        var endpointPath = forceReporting ? "/invoices/reporting/single" : "/invoices/clearance/single";

        ZatcaSubmissionResponse response;
        try
        {
            response = await _client.SubmitInvoiceAsync(
                endpointPath,
                Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(finalSignedXml)),
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
        invoice.ZatcaSignedXml = finalSignedXml;
        invoice.ZatcaQrBase64 = !string.IsNullOrWhiteSpace(response.Qr) ? response.Qr : qrBase64;
        invoice.ZatcaSubmissionDateTime = DateTime.UtcNow;
        invoice.ZatcaIcv = icv;
        invoice.ZatcaPreviousInvoiceHash = previousInvoiceHash;
        invoice.UpdatedAt = DateTime.UtcNow;

        if (success)
        {
            lockedCredential.LastIcv = icv;
            lockedCredential.LastInvoiceHash = signatureResult.InvoiceHash;
        }

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

    private static IEnumerable<(string DocumentTypeCode, bool IsStandard, string Description)> GetRequiredComplianceSamples(string? invoiceType)
    {
        var type = string.IsNullOrWhiteSpace(invoiceType) ? "1100" : invoiceType.Trim();
        var needsStandard = type is "1000" or "1100";
        var needsSimplified = type is "0100" or "1100";

        if (needsStandard)
        {
            yield return ("388", true, "Standard Tax Invoice");
            yield return ("381", true, "Standard Credit Note");
            yield return ("383", true, "Standard Debit Note");
        }
        if (needsSimplified)
        {
            yield return ("388", false, "Simplified Tax Invoice");
            yield return ("381", false, "Simplified Credit Note");
            yield return ("383", false, "Simplified Debit Note");
        }
    }

    private static string BuildEgsSerialNumber(long storeId) =>
        $"1-FatooraRahatak|2-1.0.0|3-{storeId}";

    private static string ResolveCertificateTemplateName(string? environment) => environment?.Trim().ToLowerInvariant() switch
    {
        "production" or "prod" => "ZATCA-Code-Signing",
        "simulation" or "sim" => "PREZATCA-Code-Signing",
        _ => "TSTZATCA-Code-Signing"
    };

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
