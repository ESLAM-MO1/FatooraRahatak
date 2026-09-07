using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// بوابة تابي (الدفع لاحقًا / قسّطها) — BNPL سعودية.
/// يُنشئ جلسة دفع (Checkout Session) ويُعيد رابط الاستضافة حيث يُكمل العميل الدفع على صفحة تابي.
/// </summary>
public class TabbyPaymentProvider
{
    private readonly string _secretKey;
    private readonly string _baseUrl;
    private readonly string _publicKey;
    private readonly HttpClient _httpClient;

    public TabbyPaymentProvider(IConfiguration configuration, HttpClient httpClient)
    {
        _secretKey = configuration["Tabby:SecretKey"] ?? "";
        _publicKey = configuration["Tabby:PublicKey"] ?? "";
        _baseUrl = configuration["Tabby:BaseUrl"] ?? "https://api.tabby.ai/api/v1";
        _httpClient = httpClient;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_secretKey);

    public async Task<TabbyPaymentResult> CreateCheckoutSessionAsync(
        decimal amount,
        string currency,
        string description,
        string? successUrl,
        string? cancelUrl,
        string? customerEmail = null,
        string? customerName = null,
        string? customerPhone = null)
    {
        if (!IsConfigured)
            return new TabbyPaymentResult { Success = false, ErrorMessage = "إعدادات تابي غير مكتملة — لتفعيل الدفع عبر تابي يجب ضبط مفتاح API في إعدادات المنصة" };

        try
        {
            var order = new Dictionary<string, object>
            {
                ["reference_id"] = Guid.NewGuid().ToString("N")[..20],
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
                ["merchant_code"] = _publicKey,
                ["merchant_urls"] = merchantUrls,
                ["lang"] = "ar"
            };
            if (buyer.Count > 0) payload["buyer"] = buyer;

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/checkout/sessions")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _secretKey);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new TabbyPaymentResult { Success = false, ErrorMessage = $"فشل إنشاء جلسة تابي ({(int)response.StatusCode})", RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            // الاستجابة قد تكون { "data": { "payment": { "id": ..., "url": ... } } } أو مسطحة
            var data = root.TryGetProperty("data", out var d) ? d : root;
            var paymentNode = data.TryGetProperty("payment", out var p) ? p : data;
            var id = paymentNode.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
            var url = paymentNode.TryGetProperty("url", out var urlProp) ? urlProp.GetString() : null;
            var checkoutUrl = root.TryGetProperty("checkout_url", out var cu) ? cu.GetString() : null;

            if (string.IsNullOrWhiteSpace(url) && !string.IsNullOrWhiteSpace(checkoutUrl))
                url = checkoutUrl;

            if (string.IsNullOrWhiteSpace(url))
                return new TabbyPaymentResult { Success = false, ErrorMessage = "استجابة تابي بلا رابط دفع", RawResponse = json };

            return new TabbyPaymentResult
            {
                Success = true,
                ProviderPaymentId = id,
                PaymentUrl = url,
                Amount = amount,
                Currency = currency,
                Status = "Pending"
            };
        }
        catch (Exception ex)
        {
            return new TabbyPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
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