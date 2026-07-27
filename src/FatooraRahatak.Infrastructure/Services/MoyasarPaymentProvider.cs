using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class MoyasarPaymentProvider
{
    private readonly string _publicKey;
    private readonly string _secretKey;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;

    public MoyasarPaymentProvider(IConfiguration configuration, HttpClient httpClient)
    {
        _publicKey = configuration["Moyasar:PublicKey"] ?? "";
        _secretKey = configuration["Moyasar:SecretKey"] ?? "";
        _baseUrl = configuration["Moyasar:BaseUrl"] ?? "https://api.moyasar.com/v1";
        _httpClient = httpClient;

        if (!string.IsNullOrWhiteSpace(_publicKey) && !string.IsNullOrWhiteSpace(_secretKey))
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_publicKey}:{_secretKey}")));
        }
    }

    public async Task<MoyasarPaymentResult> CreatePaymentAsync(decimal amount, string currency, string description, string? callbackUrl = null, string? customerEmail = null, string? customerName = null, string? customerPhone = null)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["amount"] = (int)(amount * 100),
                ["currency"] = currency,
                ["description"] = description,
                ["callback_url"] = callbackUrl ?? "https://api.moyasar.com/v1/callback"
            };

            if (customerEmail != null)
                payload["customer_email"] = customerEmail;
            if (customerName != null)
                payload["customer_name"] = customerName;
            if (customerPhone != null)
                payload["customer_phone"] = customerPhone;

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/payments", payload);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Moyasar API error ({(int)response.StatusCode}): {json}"
                };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var paymentId = root.GetProperty("id").GetString() ?? "";
            var paymentUrl = root.GetProperty("url").GetString() ?? "";

            return new MoyasarPaymentResult
            {
                Success = true,
                ProviderPaymentId = paymentId,
                PaymentUrl = paymentUrl,
                Amount = amount,
                Currency = currency,
                Status = "Pending",
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new MoyasarPaymentResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<MoyasarPaymentResult> GetPaymentStatusAsync(string providerPaymentId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/payments/{providerPaymentId}");

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Moyasar API error ({(int)response.StatusCode})"
                };
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new MoyasarPaymentResult
            {
                Success = true,
                ProviderPaymentId = providerPaymentId,
                Amount = root.GetProperty("amount").GetInt32() / 100m,
                Currency = root.TryGetProperty("currency", out var cur) ? cur.GetString() : "SAR",
                Status = MapProviderStatus(root.GetProperty("status").GetString()),
                PaidAt = root.TryGetProperty("paid_at", out var paidAt) ? paidAt.GetString() : null,
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new MoyasarPaymentResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public async Task<MoyasarPaymentResult> RefundPaymentAsync(string providerPaymentId, decimal? amount = null)
    {
        try
        {
            var payload = new Dictionary<string, object>();
            if (amount.HasValue)
                payload["amount"] = (int)(amount.Value * 100);

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/payments/{providerPaymentId}/refund", payload);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Refund failed ({(int)response.StatusCode}): {json}"
                };
            }

            return new MoyasarPaymentResult
            {
                Success = true,
                ProviderPaymentId = providerPaymentId,
                Status = "Refunded",
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new MoyasarPaymentResult
            {
                Success = false,
                ErrorMessage = ex.Message
            };
        }
    }

    public MoyasarWebhookData ParseWebhookJson(string jsonBody)
    {
        using var doc = JsonDocument.Parse(jsonBody);
        var root = doc.RootElement;

        return new MoyasarWebhookData
        {
            PaymentId = root.TryGetProperty("id", out var id) ? id.GetString() : null,
            Amount = root.TryGetProperty("amount", out var amt) ? amt.GetInt32() / 100m : 0,
            Currency = root.TryGetProperty("currency", out var cur) ? cur.GetString() : null,
            Status = root.TryGetProperty("status", out var st) ? st.GetString() : null,
            Reference = root.TryGetProperty("reference", out var rf) ? rf.GetString() : null,
            CreatedAt = root.TryGetProperty("created_at", out var ca) ? ca.GetString() : null,
            PaidAt = root.TryGetProperty("paid_at", out var pa) ? pa.GetString() : null,
            Signature = root.TryGetProperty("signature", out var sig) ? sig.GetString() : null,
            SourceType = root.TryGetProperty("source", out var src) && src.TryGetProperty("type", out var stType) ? stType.GetString() : null,
            SourceTransactionId = root.TryGetProperty("source", out var src2) && src2.TryGetProperty("transaction_id", out var stId) ? stId.GetString() : null
        };
    }

    public bool VerifyWebhookSignature(string jsonBody, string signature)
    {
        if (string.IsNullOrWhiteSpace(_secretKey))
            return false;

        var expected = ComputeHmacSha256(jsonBody, _secretKey);
        return expected.Equals(signature, StringComparison.OrdinalIgnoreCase);
    }

    private static string ComputeHmacSha256(string message, string secret)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return Convert.ToBase64String(hash);
    }

    private static string MapProviderStatus(string? providerStatus)
    {
        return providerStatus?.ToLower() switch
        {
            "paid" or "completed" or "successful" => "Paid",
            "pending" or "processing" => "Pending",
            "failed" or "declined" or "refused" => "Failed",
            "refunded" or "partially_refunded" => "Refunded",
            _ => providerStatus ?? "unknown"
        };
    }
}

public class MoyasarPaymentResult
{
    public bool Success { get; set; }
    public string ProviderPaymentId { get; set; } = string.Empty;
    public string? PaymentUrl { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Status { get; set; } = "Pending";
    public string? PaidAt { get; set; }
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}

public class MoyasarWebhookData
{
    public string? PaymentId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
    public string? Status { get; set; }
    public string? Reference { get; set; }
    public string? CreatedAt { get; set; }
    public string? PaidAt { get; set; }
    public string? Signature { get; set; }
    public string? SourceType { get; set; }
    public string? SourceTransactionId { get; set; }
}