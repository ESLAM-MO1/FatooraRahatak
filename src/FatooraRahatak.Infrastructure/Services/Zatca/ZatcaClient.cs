using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace FatooraRahatak.Infrastructure.Services.Zatca;

public class ZatcaClient
{
    private readonly HttpClient _httpClient;
    private readonly IOptions<ZatcaSettings> _settings;

    public ZatcaClient(HttpClient httpClient, IOptions<ZatcaSettings> settings)
    {
        _httpClient = httpClient;
        _settings = settings;
    }

    public string BaseUrl => (_settings.Value.BaseUrl ?? string.Empty).TrimEnd('/');

    public async Task<ZatcaComplianceResponse> ComplianceOnboardAsync(
        string csrBase64,
        string vatNumber,
        string otp,
        string solutionName,
        string complianceRequestId,
        string complianceRequestSecret,
        bool isProductionRenewal,
        CancellationToken ct = default)
    {
        var endpoint = isProductionRenewal ? "/compliance" : "/production/csids";
        var url = BaseUrl + endpoint;

        var payload = new Dictionary<string, string>
        {
            ["csr"] = csrBase64,
            ["otp"] = otp,
            ["vat_number"] = vatNumber,
            ["invoice_counter"] = "1",
            ["solution_name"] = solutionName
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("Accept-Version", isProductionRenewal ? "V2" : "V1");
        request.Headers.TryAddWithoutValidation("Accept-Language", "en");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{complianceRequestId}:{complianceRequestSecret}")));

        using var response = await _httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"تعذر تسجيل الجهاز لدى زاتكا ({(int)response.StatusCode}): {Truncate(body, 500)}");

        var result = JsonSerializer.Deserialize<ZatcaComplianceResponse>(body, JsonOpts)
            ?? new ZatcaComplianceResponse();

        if (result.Errors is { Count: > 0 })
            throw new InvalidOperationException($"زاتكا رفضت الطلب: {string.Join(" | ", result.Errors)}");

        if (string.IsNullOrWhiteSpace(result.BinarySecurityToken))
            throw new InvalidOperationException("زاتكا لم تُرجع شهادة CSID في الرد");

        return result;
    }

    public async Task<ZatcaSubmissionResponse> SubmitInvoiceAsync(
        string endpointPath,
        string signedXmlBase64,
        string invoiceHash,
        string uuid,
        string csid,
        string csidSecret,
        CancellationToken ct = default)
    {
        var url = BaseUrl + endpointPath;

        var payload = new Dictionary<string, string>
        {
            ["invoiceHash"] = invoiceHash,
            ["uuid"] = uuid,
            ["invoice"] = signedXmlBase64
        };

        var request = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
        };
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        request.Headers.TryAddWithoutValidation("Accept-Version", "V2");
        request.Headers.TryAddWithoutValidation("Accept-Language", "en");
        request.Headers.TryAddWithoutValidation("Accept-ClearingStatus", "CLEARED, CLEARED_WITH_WARNING");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes($"{csid}:{csidSecret}")));

        using var response = await _httpClient.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"فشل إرسال الفاتورة لزاتكا ({(int)response.StatusCode}): {Truncate(body, 800)}");

        var result = JsonSerializer.Deserialize<ZatcaSubmissionResponse>(body, JsonOpts)
            ?? new ZatcaSubmissionResponse();

        result.RawResponse = body;
        return result;
    }

    private static string Truncate(string value, int max) =>
        value.Length <= max ? value : value[..max];

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };
}

public class ZatcaComplianceResponse
{
    public string? RequestId { get; set; }
    public string? DispositionMessage { get; set; }
    public string? BinarySecurityToken { get; set; }
    public string? Secret { get; set; }
    public List<string>? Errors { get; set; }
}

public class ZatcaSubmissionResponse
{
    public string? Status { get; set; }
    public string? ReportingStatus { get; set; }
    public string? ClearingStatus { get; set; }
    public string? ClearedInvoice { get; set; }
    public string? Qr { get; set; }
    public ZatcaValidationResults? ValidationResults { get; set; }
    public string? RawResponse { get; set; }
}

public class ZatcaValidationResults
{
    public string? Status { get; set; }
    public List<string>? InfoMessages { get; set; }
    public List<string>? WarningMessages { get; set; }
    public List<string>? ErrorMessages { get; set; }
}
