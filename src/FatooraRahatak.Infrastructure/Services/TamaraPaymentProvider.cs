using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// بوابة تمارا (اشترِ الآن وادفع لاحقًا / قسّطها) — BNPL سعودية.
/// يُنشئ جلسة دفع (Checkout Session) ويُعيد رابط الاستضافة حيث يُكمل العميل الدفع على صفحة تمارا.
/// </summary>
public class TamaraPaymentProvider
{
    private readonly string _token;
    private readonly string _baseUrl;
    private readonly HttpClient _httpClient;

    public TamaraPaymentProvider(IConfiguration configuration, HttpClient httpClient)
    {
        _token = configuration["Tamara:ApiToken"] ?? "";
        _baseUrl = configuration["Tamara:BaseUrl"] ?? "https://api.tamara.co";
        _httpClient = httpClient;
    }

    public bool IsConfigured => !string.IsNullOrWhiteSpace(_token);

    public async Task<TamaraPaymentResult> CreateCheckoutSessionAsync(
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
            return new TamaraPaymentResult { Success = false, ErrorMessage = "إعدادات تمارا غير مكتملة — لتفعيل الدفع عبر تمارا يجب ضبط مفتاح API في إعدادات المنصة" };

        try
        {
            var order = new Dictionary<string, object>
            {
                ["reference_id"] = Guid.NewGuid().ToString("N")[..20],
                ["description"] = description,
                ["country_code"] = "SA",
                ["currency"] = currency,
                ["total_amount"] = new Dictionary<string, object>
                {
                    ["amount"] = amount.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture),
                    ["currency"] = currency
                }
            };

            var consumer = new Dictionary<string, object>();
            if (customerPhone != null) consumer["phone_number"] = customerPhone;
            if (customerEmail != null) consumer["email"] = customerEmail;
            if (customerName != null) consumer["first_name"] = customerName;

            var merchantUrl = new Dictionary<string, object>
            {
                ["success"] = successUrl ?? "https://your-domain.com",
                ["cancel"] = cancelUrl ?? "https://your-domain.com",
                ["failure"] = cancelUrl ?? "https://your-domain.com"
            };

            var payload = new Dictionary<string, object>
            {
                ["order"] = order,
                ["consumer"] = consumer,
                ["merchant_url"] = merchantUrl,
                ["locale"] = "ar_SA"
            };

            var request = new HttpRequestMessage(HttpMethod.Post, $"{_baseUrl}/checkout/sessions")
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

            var response = await _httpClient.SendAsync(request);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return new TamaraPaymentResult { Success = false, ErrorMessage = $"فشل إنشاء جلسة تمارا ({(int)response.StatusCode})", RawResponse = json };

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var checkoutUrl = root.TryGetProperty("checkout_url", out var cu) ? cu.GetString() : null;
            var id = root.TryGetProperty("order_id", out var oi) ? oi.GetString() : null;

            if (string.IsNullOrWhiteSpace(checkoutUrl))
                return new TamaraPaymentResult { Success = false, ErrorMessage = "استجابة تمارا بلا رابط دفع", RawResponse = json };

            return new TamaraPaymentResult
            {
                Success = true,
                ProviderPaymentId = id,
                PaymentUrl = checkoutUrl,
                Amount = amount,
                Currency = currency,
                Status = "Pending"
            };
        }
        catch (Exception ex)
        {
            return new TamaraPaymentResult { Success = false, ErrorMessage = ex.Message };
        }
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
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}