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

        if (!string.IsNullOrWhiteSpace(_secretKey))
        {
            // مواسر يقبل Basic auth بمفتاح السيكرت فقط (secret_key:)، وليس "public:secret".
            // إرسال pk:sk كان يرفض أي عملية بالخطأ "User not authorized" → البوابة ما كانت بتفتح أبدًا.
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
                "Basic",
                Convert.ToBase64String(Encoding.UTF8.GetBytes($"{_secretKey}:")));
        }
    }

    public async Task<MoyasarPaymentResult> CreatePaymentAsync(decimal amount, string currency, string description, string? callbackUrl = null, string? customerEmail = null, string? customerName = null, string? customerPhone = null, string? recipientId = null, string? cardHolder = null, string? cardNumber = null, string? cardExpiryMonth = null, string? cardExpiryYear = null, string? cardCvc = null)
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

            // بيانات البطاقة: نرسلها كـ source مباشرة لموياسر لإنشاء الدفع وفتح صفحة 3DS
            if (!string.IsNullOrWhiteSpace(cardNumber) && !string.IsNullOrWhiteSpace(cardHolder))
            {
                payload["source"] = new Dictionary<string, object>
                {
                    ["type"] = "creditcard",
                    ["name"] = cardHolder,
                    ["number"] = cardNumber,
                    ["month"] = cardExpiryMonth ?? "",
                    ["year"] = cardExpiryYear ?? "",
                    ["cvc"] = cardCvc ?? ""
                };
            }
            // ❗️ Sub-merchant / Splits: عند الدفع بمعرّف مستقبل (مالك المتجر)
            // المبلغ كله يتحول لحساب الـ Owner مباشرة — المنصة مفيش عمولة بيع.
            else if (!string.IsNullOrWhiteSpace(recipientId))
            {
                payload["splits"] = new object[]
                {
                    new Dictionary<string, object>
                    {
                        ["recipient_id"] = recipientId,
                        ["amount"] = (int)(amount * 100),
                        ["reference"] = "store_owner_share",
                        ["fee_source"] = false,
                        ["refundable"] = true
                    }
                };
            }

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/payments", payload);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = BuildFriendlyGatewayError(json),
                    RawResponse = json
                };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var paymentId = root.GetProperty("id").GetString() ?? "";
            // رابط الدفع الحديث في موياسر: source.transaction_url (صفحة 3DS)، مع دعم url القديم
            var paymentUrl = root.TryGetProperty("url", out var urlEl) ? urlEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(paymentUrl) &&
                root.TryGetProperty("source", out var srcEl) &&
                srcEl.TryGetProperty("transaction_url", out var txEl))
            {
                paymentUrl = txEl.GetString();
            }

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

    // تحويل أخطاء موياسر الخام إلى رسالة عربية واضحة للعميل
    private static string BuildFriendlyGatewayError(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            var type = root.TryGetProperty("type", out var t) ? t.GetString() : null;
            var message = root.TryGetProperty("message", out var m) ? m.GetString() : null;

            return type switch
            {
                "unsupported_schemes" => "نوع البطاقة غير مدعوم للدفع. يرجى استخدام بطاقة Mada أو Visa أو Mastercard.",
                // ⚠️ إصلاح: أخطاء التحقق من ميسرا ليست دائمًا عن البطاقة (مثل وصف فارغ عند إنشاء
                // الفاتورة) — نعرض الرسالة الفعلية من البوابة بدلًا من تعميمها على "بيانات البطاقة".
                "validation_error" or "invalid_request_error" =>
                    $"تعذر إتمام العملية. {(!string.IsNullOrWhiteSpace(message) ? message : "يرجى مراجعة البيانات وإعادة المحاولة.")}",
                "authentication_error" => "تعذر الاتصال ببوابة الدفع. يرجى المحاولة مرة أخرى.",
                "account_inactive_error" => "حساب الدفع غير مفعّل حاليًا. يرجى التواصل مع المتجر.",
                _ => $"تعذر إتمام الدفع. {(string.IsNullOrWhiteSpace(message) ? "يرجى المحاولة مرة أخرى." : message)}"
            };
        }
        catch
        {
            return "تعذر إتمام الدفع. يرجى المحاولة مرة أخرى.";
        }
    }

    // 🧾 إنشاء فاتورة عند موياسر (Invoices API) → صفحة دفع محمية يستكمل العميل فيها
    // بيانات بطاقته بنفسه على صفحة موياسر (Hosted Checkout) — لا نلمس بيانات الكارت أبدًا.
    public async Task<MoyasarPaymentResult> CreateInvoiceAsync(
        decimal amount,
        string currency,
        string description,
        string? callbackUrl = null,
        string? successUrl = null,
        string? backUrl = null,
        string? customerEmail = null)
    {
        try
        {
            // ⚠️ إصلاح: ميسرا يرفض إنشاء الفاتورة لو كان الوصف (description) فارغًا
            // بخطأ "validation_error" → كان يتسبب في إظهار رسالة مضللة للعميل بدل فتح بوابة الدفع.
            var payload = new Dictionary<string, object>
            {
                ["amount"] = (int)(amount * 100),
                ["currency"] = currency,
                ["description"] = string.IsNullOrWhiteSpace(description) ? "دفع - فاتورة راحتك" : description
            };

            // callback_url: إشعار من ميسرا لسيرفرنا (webhook) عند اكتمال الدفع
            // success_url: صفحة نعيد العميل إليها بعد نجاح الدفع
            if (!string.IsNullOrWhiteSpace(callbackUrl))
                payload["callback_url"] = callbackUrl;
            if (!string.IsNullOrWhiteSpace(successUrl))
                payload["success_url"] = successUrl;
            if (!string.IsNullOrWhiteSpace(backUrl))
                payload["back_url"] = backUrl;

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/invoices", payload);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = BuildFriendlyGatewayError(json),
                    RawResponse = json
                };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new MoyasarPaymentResult
            {
                Success = true,
                ProviderPaymentId = root.TryGetProperty("id", out var id) ? id.GetString() : null,
                PaymentUrl = root.TryGetProperty("url", out var url) ? url.GetString() : null,
                Amount = root.TryGetProperty("amount", out var amt) ? amt.GetInt32() / 100m : amount,
                Currency = root.TryGetProperty("currency", out var cur) ? cur.GetString() : currency,
                Status = MapInvoiceStatus(root.TryGetProperty("status", out var st) ? st.GetString() : null),
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
            // ⚠️ إصلاح: كل الدفعات المُنشأة عبر CreateInvoiceAsync (الدفع المحمي/Hosted Checkout —
            // وهو المسار الافتراضي دائمًا لتجديد الاشتراك ولمعظم عمليات الدفع) يُخزَّن لها معرّف
            // فاتورة (invoice id) وليس معرّف دفعة مباشرة. الاعتماد على تخمين "جرّب /payments أولًا،
            // ولو فشل جرّب /invoices" كان هشًّا: أي استجابة غير متوقعة من موياسر (غير 404 واضح)
            // تُفسَّر بالغلط أو تفشل بصمت دون تفعيل الاشتراك رغم نجاح الدفع فعليًا.
            // الآن نتحقق من الفاتورة أولًا مباشرة (المسار الصحيح والمؤكد لهذا المعرّف)، ولا نلجأ
            // لمسار الدفعة المباشرة إلا لو فشل ذلك فعلًا (توافقًا مع مسار الكارت المدمج القديم).
            var invoiceResult = await GetInvoiceStatusAsync(providerPaymentId);
            if (invoiceResult.Success)
                return invoiceResult;

            // https://api.moyasar.com/v1/payments/{id} — يستخدم SecretKey للتحقق من حالة الدفع (paid/failed)
            var response = await _httpClient.GetAsync($"{_baseUrl}/payments/{providerPaymentId}");

            if (!response.IsSuccessStatusCode)
                return invoiceResult; // نُرجع خطأ الفاتورة الأصلي، أوضح من خطأ دفعة غير موجودة أصلًا

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

    // الحالة من فاتورة موياسر: الفاتورة "paid" تعني اكتمال الدفع، و"initiated" تعني ما زال مفتوحًا
    public async Task<MoyasarPaymentResult> GetInvoiceStatusAsync(string invoiceId)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{_baseUrl}/invoices/{invoiceId}");
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarPaymentResult
                {
                    Success = false,
                    ErrorMessage = $"Moyasar API error ({(int)response.StatusCode})"
                };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            string? resolvedPaymentId = null;
            if (root.TryGetProperty("payments", out var payments) && payments.ValueKind == JsonValueKind.Array)
            {
                foreach (var payment in payments.EnumerateArray())
                {
                    if (payment.TryGetProperty("id", out var pid))
                    {
                        resolvedPaymentId = pid.GetString();
                        break;
                    }
                }
            }

            return new MoyasarPaymentResult
            {
                Success = true,
                ProviderPaymentId = resolvedPaymentId ?? invoiceId,
                Amount = root.TryGetProperty("amount", out var amt) ? amt.GetInt32() / 100m : 0,
                Currency = root.TryGetProperty("currency", out var cur) ? cur.GetString() : "SAR",
                Status = MapInvoiceStatus(root.TryGetProperty("status", out var st) ? st.GetString() : null),
                PaidAt = null,
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

    // ❗️ إنشاء حساب مستلم (sub-merchant) في ميسرة — أوتوماتيك بالكامل
    // بياخد البيانات البنكية من الـ Owner وبيحاول يعمل الحساب لوحده.
    public async Task<MoyasarRecipientResult> CreateRecipientAsync(string holderName, string bankName, string iban)
    {
        try
        {
            var payload = new Dictionary<string, object>
            {
                ["type"] = "bank",
                ["properties"] = new Dictionary<string, object>
                {
                    ["iban"] = iban,
                    ["holder_name"] = holderName,
                    ["bank_name"] = bankName,
                    ["country"] = "SA",
                    ["city"] = "Riyadh"
                }
            };

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/recipients", payload);
            var json = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new MoyasarRecipientResult
                {
                    Success = false,
                    ErrorMessage = $"Moyasar recipient error ({(int)response.StatusCode}): {json}"
                };
            }

            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            return new MoyasarRecipientResult
            {
                Success = true,
                RecipientId = root.TryGetProperty("id", out var id) ? id.GetString() : null,
                RawResponse = json
            };
        }
        catch (Exception ex)
        {
            return new MoyasarRecipientResult
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
            // الفاتورة تحوي محاولات دفع فعلية — نوضح معرّف الدفعة الحقيقي قبل الاسترداد
            var targetPaymentId = providerPaymentId;
            var invoiceStatus = await GetInvoiceStatusAsync(providerPaymentId);
            if (!string.IsNullOrWhiteSpace(invoiceStatus.ProviderPaymentId) &&
                !string.Equals(invoiceStatus.ProviderPaymentId, providerPaymentId, StringComparison.OrdinalIgnoreCase))
            {
                targetPaymentId = invoiceStatus.ProviderPaymentId!;
            }
            else if (!invoiceStatus.Success)
            {
                // ليس معرّف فاتورة — نتعامل معه كدفعة مباشرة
                targetPaymentId = providerPaymentId;
            }

            var payload = new Dictionary<string, object>();
            if (amount.HasValue)
                payload["amount"] = (int)(amount.Value * 100);

            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/payments/{targetPaymentId}/refund", payload);
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
                ProviderPaymentId = targetPaymentId,
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

    private static string MapInvoiceStatus(string? status)
    {
        return status?.ToLower() switch
        {
            "initiated" or "on_hold" => "Pending",
            "paid" => "Paid",
            "failed" => "Failed",
            "refunded" => "Refunded",
            "expired" or "canceled" or "voided" => "Failed",
            _ => status ?? "unknown"
        };
    }

    public MoyasarWebhookData ParseWebhookJson(string jsonBody)
    {
        using var doc = JsonDocument.Parse(jsonBody);
        var root = doc.RootElement;

        // 🔍 موياسر يرسل صيغتين:
        //   1) كائن الفاتورة نفسها إلى callback_url الخاص بالفاتورة:
        //      { "id": invoice_id, "status": "paid", ... } — id هنا معرّف الفاتورة.
        //   2) غلاف حدث الدفع (Dashboard Webhooks / payment_paid ...):
        //      { "data": { "id": payment_id, "invoice_id": invoice_id, "status": ..., ... } }.
        // نقرأ الصيغتين معًا حتى نطابق الدفعة بأي معرّف.
        string? paymentId = null;
        string? invoiceId = null;
        string? status = null;
        string? currency = null;
        decimal amount = 0;

        if (root.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Object)
        {
            // غلاف الحدث: الدفع الفعلي داخل data
            paymentId = dataEl.TryGetProperty("id", out var pid) ? pid.GetString() : null;
            invoiceId = dataEl.TryGetProperty("invoice_id", out var iid) ? iid.GetString() : null;
            status = dataEl.TryGetProperty("status", out var st) ? st.GetString() : null;
            if (dataEl.TryGetProperty("amount", out var amt) && amt.ValueKind == JsonValueKind.Number)
                amount = amt.GetInt32() / 100m;
            if (dataEl.TryGetProperty("currency", out var cur)) currency = cur.GetString();
        }
        else
        {
            // كائن الفاتورة مباشرة: id هو معرّف الفاتورة المخزّن عندنا في ProviderPaymentId
            paymentId = root.TryGetProperty("id", out var id) ? id.GetString() : null;
            invoiceId = paymentId;
            status = root.TryGetProperty("status", out var st) ? st.GetString() : null;
            if (root.TryGetProperty("amount", out var amt) && amt.ValueKind == JsonValueKind.Number)
                amount = amt.GetInt32() / 100m;
            if (root.TryGetProperty("currency", out var cur)) currency = cur.GetString();
        }

        return new MoyasarWebhookData
        {
            PaymentId = paymentId,
            InvoiceId = invoiceId,
            Amount = amount,
            Currency = currency,
            Status = status,
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
    public string? InvoiceId { get; set; }
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

public class MoyasarRecipientResult
{
    public bool Success { get; set; }
    public string? RecipientId { get; set; }
    public string? RawResponse { get; set; }
    public string? ErrorMessage { get; set; }
}