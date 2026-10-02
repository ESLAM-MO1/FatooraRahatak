using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;

namespace FatooraRahatak.Infrastructure.Services;

public class TamaraPaymentProvider
{
    private const string ProdUrl = "https://api.tamara.co";
    private const string SandboxUrl = "https://api-sandbox.tamara.co";
    private readonly HttpClient _httpClient;
    private readonly ILogger<TamaraPaymentProvider> _logger;

    public TamaraPaymentProvider(HttpClient httpClient, ILogger<TamaraPaymentProvider> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    private static string Base(bool testMode) => testMode ? SandboxUrl : ProdUrl;

    private static HttpRequestMessage Build(HttpMethod method, string url, string token, object? body = null)
    {
        var req = new HttpRequestMessage(method, url);
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        if (body != null)
            req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");
        return req;
    }

    public async Task<TamaraPaymentResult> CreateCheckoutSessionAsync(
        string apiToken,
        bool testMode,
        decimal amount,
        string currency,
        string description,
        string referenceId,
        string? successUrl,
        string? cancelUrl,
        string notificationUrl,
        string? customerEmail = null,
        string? customerName = null,
        string? customerPhone = null)
    {
        if (string.IsNullOrWhiteSpace(apiToken))
            return new TamaraPaymentResult { Success = false, ErrorMessage = "التاجر لم يضبط بيانات تمارا" };

        try
        {
            var amountObj = new Dictionary<string, object>
            {
                ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
                ["currency"] = currency
            };
            var zero = new Dictionary<string, object> { ["amount"] = "0.00", ["currency"] = currency };

            var address = new Dictionary<string, object>
            {
                ["first_name"] = customerName ?? "Customer",
                ["last_name"] = ".",
                ["line1"] = "-",
                ["city"] = "Riyadh",
                ["country_code"] = "SA",
                ["phone_number"] = customerPhone ?? ""
            };

            var payload = new Dictionary<string, object>
            {
                ["order_reference_id"] = referenceId,
                ["total_amount"] = amountObj,
                ["description"] = description,
                ["country_code"] = "SA",
                ["payment_type"] = "PAY_BY_INSTALMENTS",
                ["locale"] = "ar_SA",
                ["items"] = new[]
                {
                    new Dictionary<string, object>
                    {
                        ["reference_id"] = referenceId,
                        ["type"] = "Physical",
                        ["name"] = description,
                        ["sku"] = referenceId,
                        ["quantity"] = 1,
                        ["total_amount"] = amountObj
                    }
                },
                ["consumer"] = new Dictionary<string, object>
                {
                    ["first_name"] = customerName ?? "Customer",
                    ["last_name"] = ".",
                    ["phone_number"] = customerPhone ?? "",
                    ["email"] = customerEmail ?? "customer@example.com"
                },
                ["shipping_address"] = address,
                ["billing_address"] = address,
                ["tax_amount"] = zero,
                ["shipping_amount"] = zero,
                ["merchant_url"] = new Dictionary<string, object>
                {
                    ["success"] = successUrl ?? "https://your-domain.com",
                    ["failure"] = cancelUrl ?? "https://your-domain.com",
                    ["cancel"] = cancelUrl ?? "https://your-domain.com",
                    ["notification"] = notificationUrl
                }
            };

            var response = await _httpClient.SendAsync(Build(HttpMethod.Post, $"{Base(testMode)}/checkout", apiToken, payload));
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tamara checkout فشل. Status={Status} Response={Json}", (int)response.StatusCode, json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"فشل إنشاء جلسة تمارا ({(int)response.StatusCode})", RawResponse = json };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var checkoutUrl = root.TryGetProperty("checkout_url", out var cu) ? cu.GetString() : null;
            var id = root.TryGetProperty("order_id", out var oi) ? oi.GetString() : null;

            if (string.IsNullOrWhiteSpace(checkoutUrl))
            {
                _logger.LogError("Tamara بلا رابط دفع. Response={Json}", json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = "استجابة تمارا بلا رابط دفع", RawResponse = json };
            }

            return new TamaraPaymentResult
            {
                Success = true,
                ProviderPaymentId = id,
                PaymentUrl = checkoutUrl,
                Amount = amount,
                Currency = currency,
                Status = "Pending",
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara checkout exception");
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TamaraPaymentResult> GetOrderStatusAsync(string apiToken, bool testMode, string orderId)
    {
        try
        {
            var response = await _httpClient.SendAsync(Build(HttpMethod.Get, $"{Base(testMode)}/merchants/orders/{orderId}", apiToken));
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tamara status فشل. Id={Id} Status={Status} Response={Json}", orderId, (int)response.StatusCode, json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"Tamara API error ({(int)response.StatusCode})", RawResponse = json };
            }

            using var doc = JsonDocument.Parse(json);
            var raw = doc.RootElement.TryGetProperty("status", out var st) ? st.GetString() : null;
            return new TamaraPaymentResult
            {
                Success = true,
                ProviderPaymentId = orderId,
                Status = MapStatus(raw),
                RawStatus = raw,
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara status exception. Id={Id}", orderId);
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TamaraPaymentResult> AuthoriseOrderAsync(string apiToken, bool testMode, string orderId)
    {
        try
        {
            var response = await _httpClient.SendAsync(Build(HttpMethod.Post, $"{Base(testMode)}/orders/{orderId}/authorise", apiToken));
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tamara authorise فشل. Id={Id} Status={Status} Response={Json}", orderId, (int)response.StatusCode, json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"Tamara authorise error ({(int)response.StatusCode})", RawResponse = json };
            }
            return new TamaraPaymentResult { Success = true, ProviderPaymentId = orderId, Status = "Pending", RawResponse = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara authorise exception. Id={Id}", orderId);
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TamaraPaymentResult> CaptureOrderAsync(string apiToken, bool testMode, string orderId, decimal amount, string currency, string referenceId)
    {
        try
        {
            var amountObj = new Dictionary<string, object>
            {
                ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
                ["currency"] = currency
            };
            var zero = new Dictionary<string, object> { ["amount"] = "0.00", ["currency"] = currency };
            var payload = new Dictionary<string, object>
            {
                ["order_id"] = orderId,
                ["total_amount"] = amountObj,
                ["shipping_info"] = new Dictionary<string, object>
                {
                    ["shipped_at"] = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    ["shipping_company"] = "Merchant"
                },
                ["shipping_amount"] = zero,
                ["tax_amount"] = zero,
                ["discount_amount"] = zero
            };
            var response = await _httpClient.SendAsync(Build(HttpMethod.Post, $"{Base(testMode)}/payments/capture", apiToken, payload));
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tamara capture فشل. Id={Id} Status={Status} Response={Json}", orderId, (int)response.StatusCode, json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"Tamara capture error ({(int)response.StatusCode})", RawResponse = json };
            }
            return new TamaraPaymentResult { Success = true, ProviderPaymentId = orderId, Status = "Paid", RawResponse = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara capture exception. Id={Id}", orderId);
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public async Task<TamaraPaymentResult> RefundOrderAsync(string apiToken, bool testMode, string orderId, decimal amount, string currency)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["total_amount"] = new Dictionary<string, object>
                {
                    ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
                    ["currency"] = currency
                },
                ["comment"] = "Refund"
            };
            var response = await _httpClient.SendAsync(Build(HttpMethod.Post, $"{Base(testMode)}/payments/simplified-refund/{orderId}", apiToken, payload));
            var json = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Tamara refund فشل. Id={Id} Status={Status} Response={Json}", orderId, (int)response.StatusCode, json);
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"Tamara refund error ({(int)response.StatusCode}): {json}", RawResponse = json };
            }
            return new TamaraPaymentResult { Success = true, ProviderPaymentId = orderId, Status = "Refunded", RawResponse = json };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara refund exception. Id={Id}", orderId);
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    public bool VerifyNotificationToken(string token, string notificationToken)
    {
        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(notificationToken))
            return false;
        try
        {
            var handler = new JwtSecurityTokenHandler();
            handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(notificationToken)),
                ClockSkew = TimeSpan.FromMinutes(2)
            }, out _);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Tamara notification token غير صالح");
            return false;
        }
    }

    public static string MapStatus(string? status)
    {
        return status?.ToLowerInvariant() switch
        {
            "approved" or "authorised" or "authorized" or "fully_captured" or "partially_captured" => "Paid",
            "new" or "processing" => "Pending",
            "declined" or "expired" or "canceled" or "cancelled" => "Failed",
            "fully_refunded" or "partially_refunded" => "Refunded",
            _ => "Pending"
        };
    }
}

public class TamaraPaymentResult
{
    public bool Success { get; set; }
    public string? ProviderPaymentId { get; set; }
    public string? PaymentUrl { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Status { get; set; } = "Pending";
    public string? RawStatus { get; set; }
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}
