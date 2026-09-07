using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class PayPalPaymentProvider
{
    private readonly string _clientId;
    private readonly string _clientSecret;
    private readonly string _baseUrl;
    private readonly string _webhookId;
    private readonly HttpClient _httpClient;
    private string? _cachedToken;
    private DateTime _tokenExpiresAt = DateTime.MinValue;

    public PayPalPaymentProvider(IConfiguration configuration, HttpClient httpClient)
    {
        _clientId = configuration["PayPal:ClientId"] ?? "";
        _clientSecret = configuration["PayPal:ClientSecret"] ?? "";
        _baseUrl = configuration["PayPal:BaseUrl"] ?? "https://api-m.sandbox.paypal.com";
        _webhookId = configuration["PayPal:WebhookId"] ?? "";
        _httpClient = httpClient;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_clientId) && !string.IsNullOrWhiteSpace(_clientSecret);

    public async Task<PayPalPaymentResult> GetAccessTokenAsync()
    {
        if (!IsConfigured)
            return new PayPalPaymentResult { Success = false, ErrorMessage = "إعدادات PayPal غير مكتملة" };

        if (!string.IsNullOrWhiteSpace(_cachedToken) && DateTime.UtcNow < _tokenExpiresAt)
            return new PayPalPaymentResult { Success = true, AccessToken = _cachedToken };

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v1/oauth2/token")
            {
                Content = new FormUrlEncodedContent(new Dictionary<string, string>
                {
                    ["grant_type"] = "client_credentials"
                })
            };
            request.Headers.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}")));

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PayPalPaymentResult { Success = false, ErrorMessage = $"فشل الحصول على توكن PayPal ({(int)response.StatusCode})", RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var token = root.TryGetProperty("access_token", out var t) ? t.GetString() : null;
            var expiresIn = root.TryGetProperty("expires_in", out var e) ? e.GetInt32() : 0;

            if (string.IsNullOrWhiteSpace(token))
                return new PayPalPaymentResult { Success = false, ErrorMessage = "استجابة PayPal بلا توكن" };

            _cachedToken = token;
            _tokenExpiresAt = DateTime.UtcNow.AddSeconds(Math.Max(expiresIn - 60, 60));
            return new PayPalPaymentResult { Success = true, AccessToken = token };
        }
        catch (Exception ex)
        {
            return new PayPalPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    // إنشاء أمر دفع PayPal (Order) برمز approve — العميل يكمل الدفع على صفحة PayPal
    public async Task<PayPalPaymentResult> CreateOrderAsync(decimal amount, string currency, string description, string? returnUrl = null, string? cancelUrl = null)
    {
        var tokenResult = await GetAccessTokenAsync();
        if (!tokenResult.Success)
            return tokenResult;

        try
        {
            var payload = new Dictionary<string, object>
            {
                ["intent"] = "CAPTURE",
                ["purchase_units"] = new object[]
                {
                    new Dictionary<string, object>
                    {
                        ["reference_id"] = "default",
                        ["description"] = description,
                        ["amount"] = new Dictionary<string, object>
                        {
                            ["currency_code"] = currency,
                            ["value"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
                        }
                    }
                },
                ["application_context"] = new Dictionary<string, object>
                {
                    ["brand_name"] = "Fatoora Rahatak",
                    ["user_action"] = "PAY_NOW",
                    ["shipping_preference"] = "NO_SHIPPING",
                    ["return_url"] = returnUrl ?? "https://localhost:5001",
                    ["cancel_url"] = cancelUrl ?? "https://localhost:5001"
                }
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v2/checkout/orders");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
            request.Content = JsonContent.Create(payload);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PayPalPaymentResult { Success = false, ErrorMessage = BuildFriendlyError(json), RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var orderId = root.TryGetProperty("id", out var id) ? id.GetString() : null;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;

            string? approveUrl = null;
            if (root.TryGetProperty("links", out var links) && links.ValueKind == JsonValueKind.Array)
            {
                foreach (var link in links.EnumerateArray())
                {
                    var rel = link.TryGetProperty("rel", out var r) ? r.GetString() : null;
                    if (rel == "approve")
                        approveUrl = link.TryGetProperty("href", out var href) ? href.GetString() : null;
                }
            }

            return new PayPalPaymentResult
            {
                Success = true,
                ProviderPaymentId = orderId,
                PaymentUrl = approveUrl,
                Status = MapOrderStatus(status),
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new PayPalPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    // جلب حالة أمر PayPal (قبل أو بعد الإكمال)
    public async Task<PayPalPaymentResult> GetOrderStatusAsync(string orderId)
    {
        var tokenResult = await GetAccessTokenAsync();
        if (!tokenResult.Success)
            return tokenResult;

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, $"{_baseUrl}/v2/checkout/orders/{orderId}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PayPalPaymentResult { Success = false, ErrorMessage = $"فشل جلب حالة الدفع ({(int)response.StatusCode})", RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;

            string? captureId = null;
            if (root.TryGetProperty("purchase_units", out var units) && units.ValueKind == JsonValueKind.Array)
            {
                foreach (var unit in units.EnumerateArray())
                {
                    if (unit.TryGetProperty("payments", out var payments) &&
                        payments.TryGetProperty("captures", out var captures) &&
                        captures.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var capture in captures.EnumerateArray())
                        {
                            if (capture.TryGetProperty("id", out var cid))
                            {
                                captureId = cid.GetString();
                                break;
                            }
                        }
                    }
                }
            }

            return new PayPalPaymentResult
            {
                Success = true,
                ProviderPaymentId = orderId,
                ProviderCaptureId = captureId,
                Status = MapOrderStatus(status),
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new PayPalPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    // تأكيد (Capture) أمر PayPal بعد موافقة العميل
    public async Task<PayPalPaymentResult> CaptureOrderAsync(string orderId)
    {
        var tokenResult = await GetAccessTokenAsync();
        if (!tokenResult.Success)
            return tokenResult;

        try
        {
            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v2/checkout/orders/{orderId}/capture");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
            request.Content = new StringContent("{}", Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PayPalPaymentResult { Success = false, ErrorMessage = BuildFriendlyError(json), RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;

            string? captureId = null;
            if (root.TryGetProperty("purchase_units", out var units) && units.ValueKind == JsonValueKind.Array)
            {
                foreach (var unit in units.EnumerateArray())
                {
                    if (unit.TryGetProperty("payments", out var payments) &&
                        payments.TryGetProperty("captures", out var captures) &&
                        captures.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var capture in captures.EnumerateArray())
                        {
                            if (capture.TryGetProperty("id", out var cid))
                            {
                                captureId = cid.GetString();
                                break;
                            }
                        }
                    }
                }
            }

            return new PayPalPaymentResult
            {
                Success = true,
                ProviderPaymentId = orderId,
                ProviderCaptureId = captureId,
                Status = MapOrderStatus(status),
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new PayPalPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    // استرداد عبر PayPal (يتم على capture id — العملية الفعلية المُحصَّلة)
    public async Task<PayPalPaymentResult> RefundCaptureAsync(string captureId, decimal? amount = null, string currency = "SAR")
    {
        var tokenResult = await GetAccessTokenAsync();
        if (!tokenResult.Success)
            return tokenResult;

        try
        {
            var payload = new Dictionary<string, object>();
            if (amount.HasValue)
            {
                payload["amount"] = new Dictionary<string, object>
                {
                    ["currency_code"] = currency,
                    ["value"] = amount.Value.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)
                };
            }

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/v2/payments/captures/{captureId}/refund");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", tokenResult.AccessToken);
            request.Content = JsonContent.Create(payload);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new PayPalPaymentResult { Success = false, ErrorMessage = $"فشل الاسترداد ({(int)response.StatusCode})", RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            var refundId = root.TryGetProperty("id", out var rid) ? rid.GetString() : null;

            return new PayPalPaymentResult
            {
                Success = true,
                ProviderPaymentId = refundId,
                Status = status?.Equals("COMPLETED", StringComparison.OrdinalIgnoreCase) == true ? "Refunded" : status,
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new PayPalPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
    }

    // التحقق من توقيع PayPal webhook (PAYPAL-TRANSMISSION-* headers)
    // الرسالة: transmissionId | transmissionTime | webhookId | crc32(rawBody)
    // تُوقَّع RSA-SHA256 بالمفتاح العام في الشهادة على cert_url
    public async Task<bool> VerifyWebhookSignatureAsync(string rawBody, string transmissionId, string transmissionTime, string signature, string certUrl, string authAlgo)
    {
        if (string.IsNullOrWhiteSpace(_webhookId) ||
            string.IsNullOrWhiteSpace(transmissionId) ||
            string.IsNullOrWhiteSpace(transmissionTime) ||
            string.IsNullOrWhiteSpace(signature) ||
            string.IsNullOrWhiteSpace(certUrl))
            return false;

        try
        {
            if (!string.Equals(authAlgo, "SHA256withRSA", StringComparison.OrdinalIgnoreCase))
                return false;

            var crc = Crc32(Encoding.UTF8.GetBytes(rawBody));
            var message = $"{transmissionId}|{transmissionTime}|{_webhookId}|{crc}";
            var messageBytes = Encoding.UTF8.GetBytes(message);
            var signatureBytes = Convert.FromBase64String(signature);

            var publicKey = await GetRsaPublicKeyFromCertUrlAsync(certUrl);
            if (publicKey == null)
                return false;

            using var rsa = publicKey;
            return rsa.VerifyData(messageBytes, signatureBytes, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
        }
        catch
        {
            return false;
        }
    }

    private RSA? _cachedPublicKey;
    private string? _cachedCertUrl;

    private async Task<RSA?> GetRsaPublicKeyFromCertUrlAsync(string certUrl)
    {
        if (_cachedPublicKey != null && _cachedCertUrl == certUrl)
            return _cachedPublicKey;

        try
        {
            var certBytes = await _httpClient.GetByteArrayAsync(certUrl);
            var pem = Encoding.UTF8.GetString(certBytes);
            using var cert = System.Security.Cryptography.X509Certificates.X509Certificate2.CreateFromPem(pem);
            var rsa = cert.GetRSAPublicKey();
            if (rsa == null) return null;
            _cachedPublicKey = rsa;
            _cachedCertUrl = certUrl;
            return rsa;
        }
        catch
        {
            return null;
        }
    }

    // PayPal يرسل id الخاص بالطلب في resource.id أو resource.supplementary_data — نبحث في النص الكامل
    public PayPalWebhookData ParseWebhookJson(string jsonBody)
    {
        using var doc = JsonDocument.Parse(jsonBody);
        var root = doc.RootElement;

        var eventType = root.TryGetProperty("event_type", out var et) ? et.GetString() : null;
        JsonElement resource = default;
        var hasResource = root.TryGetProperty("resource", out var res) && res.ValueKind == JsonValueKind.Object;
        if (hasResource) resource = res;

        string? orderId = null;
        string? captureId = null;
        decimal amount = 0;
        string? currency = null;

        if (hasResource)
        {
            if (resource.TryGetProperty("id", out var rid))
            {
                var ridValue = rid.GetString();
                // PayPal: id داخل capture هو capture id، والطلب يكون في supplementary_data.related_ids.order_id
                captureId = ridValue;
            }

            if (resource.TryGetProperty("supplementary_data", out var sup) &&
                sup.TryGetProperty("related_ids", out var related) &&
                related.TryGetProperty("order_id", out var oid))
            {
                orderId = oid.GetString();
            }

            if (resource.TryGetProperty("amount", out var amt) && amt.ValueKind == JsonValueKind.Object)
            {
                if (amt.TryGetProperty("value", out var val))
                    decimal.TryParse(val.GetString(), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out amount);
                if (amt.TryGetProperty("currency_code", out var cur))
                    currency = cur.GetString();
            }
        }

        return new PayPalWebhookData
        {
            EventType = eventType,
            OrderId = orderId,
            CaptureId = captureId,
            Amount = amount,
            Currency = currency
        };
    }

    private static string MapOrderStatus(string? status)
    {
        return status?.ToUpper() switch
        {
            "COMPLETED" => "Paid",
            "APPROVED" => "Pending",
            "CREATED" => "Pending",
            "SAVED" => "Pending",
            "PAYER_ACTION_REQUIRED" => "Pending",
            "VOIDED" => "Failed",
            _ => status ?? "unknown"
        };
    }

    private static string BuildFriendlyError(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.TryGetProperty("message", out var msg))
                return msg.GetString() ?? "تعذر إتمام العملية لدى PayPal";
            if (root.TryGetProperty("error_description", out var desc))
                return desc.GetString() ?? "تعذر إتمام العملية لدى PayPal";
            return "تعذر إتمام العملية لدى PayPal";
        }
        catch
        {
            return "تعذر إتمام العملية لدى PayPal";
        }
    }

    private static uint Crc32(byte[] data)
    {
        uint crc = 0xFFFFFFFF;
        foreach (var b in data)
        {
            crc ^= b;
            for (var i = 0; i < 8; i++)
            {
                var mask = (uint)(-(int)(crc & 1));
                crc = (crc >> 1) ^ (0xEDB88320 & mask);
            }
        }
        return ~crc;
    }
}

public class PayPalPaymentResult
{
    public bool Success { get; set; }
    public string? ProviderPaymentId { get; set; }
    public string? ProviderCaptureId { get; set; }
    public string? PaymentUrl { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public string Status { get; set; } = "Pending";
    public string? AccessToken { get; set; }
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PayPalWebhookData
{
    public string? EventType { get; set; }
    public string? OrderId { get; set; }
    public string? CaptureId { get; set; }
    public decimal Amount { get; set; }
    public string? Currency { get; set; }
}
