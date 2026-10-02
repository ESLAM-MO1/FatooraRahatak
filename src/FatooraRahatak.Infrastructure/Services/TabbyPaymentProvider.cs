using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace FatooraRahatak.Infrastructure.Services;

public class TabbyPaymentProvider
{
    private const string BaseUrl = "https://api.tabby.ai/api/v2";
    private readonly HttpClient _httpClient;
    private readonly ILogger<TabbyPaymentProvider> _logger;

    public TabbyPaymentProvider(HttpClient httpClient, ILogger<TabbyPaymentProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    public async Task<TabbyPaymentResult> CreateCheckoutSessionAsync(
        string secretKey,
        string merchantCode,
        decimal amount,
        string currency,
        string description,
        string referenceId,
        string? successUrl,
        string? cancelUrl,
        string? customerEmail = null,
        string? customerName = null,
        string? customerPhone = null)
    {
        if (string.IsNullOrWhiteSpace(secretKey) || string.IsNullOrWhiteSpace(merchantCode))
            return new TabbyPaymentResult { Success = false, ErrorMessage = "التاجر لم يضبط بيانات تابي" };

        try
        {
            var order = new Dictionary<string, object>
            {
                ["reference_id"] = referenceId,
                ["description"] = description,
                ["currency"] = currency,
                ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
            };

            var buyer = new Dictionary<string, object>();
            if (customerEmail != null) buyer["email"] = customerEmail;
            if (customerPhone != null) buyer["phone"] = customerPhone;
            if (customerName != null) buyer["name"] = customerName;

            var merchantUrls = new Dictionary<string, object>
            {
                ["success"] = successUrl ?? "https://your-domain.com",
                ["cancel"] = cancelUrl ?? "https://your-domain.com",
                ["failure"] = cancelUrl ?? "https://your-domain.com"
            };

            var payload = new Dictionary<string, object>
            {
                ["payment"] = order,
                ["merchant_code"] = merchantCode,
                ["merchant_urls"] = merchantUrls,
                ["lang"] = "ar"
            };
            if (buyer.Count > 0) payload["buyer"] = buyer;

            var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/checkout")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tabby checkout فشل. Status={Status} Response={Json}", (int)response.StatusCode, json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = $"فشل إنشاء جلسة تابي ({(int)response.StatusCode})", RawResponse = json };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            var paymentNode = root.TryGetProperty("payment", out var p) ? p : root;
            var id = paymentNode.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
            string? url = null;
            if (root.TryGetProperty("configuration", out var cfg)
                && cfg.TryGetProperty("available_products", out var prods)
                && prods.TryGetProperty("installments", out var inst)
                && inst.ValueKind == JsonValueKind.Array && inst.GetArrayLength() > 0
                && inst[0].TryGetProperty("web_url", out var iwu))
                url = iwu.GetString();
            if (string.IsNullOrWhiteSpace(url))
                url = root.TryGetProperty("web_url", out var wu) ? wu.GetString() : null;

            if (string.Equals(status, "rejected", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Tabby رفض الطلب. Response={Json}", json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = "تابي غير متاح حاليًا لهذا الطلب", RawResponse = json };
            }

            if (string.IsNullOrWhiteSpace(url))
            {
                _logger.LogError("Tabby بلا رابط دفع. Response={Json}", json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = "استجابة تابي بلا رابط دفع", RawResponse = json };
            }

            return new TabbyPaymentResult
            {
                Success = true,
                ProviderPaymentId = id,
                PaymentUrl = url,
                Amount = amount,
                Currency = currency,
                Status = "Pending",
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tabby checkout exception");
            return new TabbyPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TabbyPaymentResult> GetPaymentStatusAsync(string secretKey, string paymentId)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}/payments/{paymentId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tabby status فشل. Id={Id} Status={Status} Response={Json}", paymentId, (int)response.StatusCode, json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = $"Tabby API error ({(int)response.StatusCode})", RawResponse = json };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var raw = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            var amount = 0m;
            if (root.TryGetProperty("amount", out var am))
                decimal.TryParse(am.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out amount);

            return new TabbyPaymentResult
            {
                Success = true,
                ProviderPaymentId = paymentId,
                Amount = amount,
                Status = MapStatus(raw),
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tabby status exception. Id={Id}", paymentId);
            return new TabbyPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TabbyPaymentResult> CapturePaymentAsync(string secretKey, string paymentId, decimal amount)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
            };
            var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/payments/{paymentId}/captures")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tabby capture فشل. Id={Id} Status={Status} Response={Json}", paymentId, (int)response.StatusCode, json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = $"Tabby capture error ({(int)response.StatusCode})", RawResponse = json };
            }

            return new TabbyPaymentResult { Success = true, ProviderPaymentId = paymentId, Status = "Paid", RawResponse = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tabby capture exception. Id={Id}", paymentId);
            return new TabbyPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TabbyPaymentResult> RefundPaymentAsync(string secretKey, string paymentId, decimal amount)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
            };
            var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/payments/{paymentId}/refunds")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secretKey);
            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tabby refund فشل. Id={Id} Status={Status} Response={Json}", paymentId, (int)response.StatusCode, json);
                return new TabbyPaymentResult { Success = false, ErrorMessage = $"Tabby refund error ({(int)response.StatusCode}): {json}", RawResponse = json };
            }

            return new TabbyPaymentResult { Success = true, ProviderPaymentId = paymentId, Status = "Refunded", RawResponse = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tabby refund exception. Id={Id}", paymentId);
            return new TabbyPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public static string MapStatus(string? status)
    {
        return status?.ToUpperInvariant() switch
        {
            "AUTHORIZED" or "CLOSED" => "Paid",
            "CREATED" or "NEW" => "Pending",
            "REJECTED" or "EXPIRED" or "CANCELED" or "CANCELLED" => "Failed",
            "REFUNDED" => "Refunded",
            _ => "Pending"
        };
    }
}

public class TabbyPaymentResult
{
    public bool Success { get; set; }
    public string? ProviderPaymentId { get; set; }
    public string? PaymentUrl { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Status { get; set; } = "Pending";
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}
