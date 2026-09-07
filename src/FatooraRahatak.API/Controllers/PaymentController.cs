using System.Security.Claims;
using System.Text;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/payments")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly MoyasarPaymentProvider _provider;
    private readonly PayPalPaymentProvider _payPalProvider;
    private readonly IPermissionCheckService _permCheck;

    public PaymentController(IPaymentService paymentService, MoyasarPaymentProvider provider, PayPalPaymentProvider payPalProvider, IPermissionCheckService permCheck)
    {
        _paymentService = paymentService;
        _provider = provider;
        _payPalProvider = payPalProvider;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    [HttpPost("create-link")]
    public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentDto dto)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _paymentService.CreatePaymentLinkAsync(dto, storeId.Value);
        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, data = result });
    }

    [HttpGet("status/{paymentReference}")]
    public async Task<IActionResult> CheckPaymentStatus(string paymentReference)
    {
        var storeId = await GetStoreIdAsync();
        if (storeId == null) return BadRequest(new { success = false, message = "لا يوجد متجر مرتبط بحسابك" });

        var result = await _paymentService.CheckPaymentStatusAsync(paymentReference, storeId.Value);
        return Ok(new { success = true, data = result });
    }

    // 🔒 Webhook محمي بالتوقيع (HMAC-SHA256) — بدون توقيع صحيح يُرفض الطلب
    // لا يتطلب توكن مستخدم لأن بوابة الدفع لا تملك واحدًا؛ الحماية عبر التوقيع فقط.
    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleWebhook()
    {
        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            rawBody = await reader.ReadToEndAsync();
        }

        if (string.IsNullOrWhiteSpace(rawBody))
            return BadRequest(new { success = false, message = "Empty webhook body" });

        var signature = Request.Headers["X-Moyasar-Signature"].FirstOrDefault();

        if (!_provider.VerifyWebhookSignature(rawBody, signature ?? string.Empty))
            return Unauthorized(new { success = false, message = "توقيع الويب هوك غير صالح" });

        var parsed = _provider.ParseWebhookJson(rawBody);

        if (parsed == null || string.IsNullOrWhiteSpace(parsed.Status))
            return BadRequest(new { success = false, message = "Invalid webhook payload" });

        await _paymentService.HandleWebhookAsync(new WebhookPayload
        {
            PaymentId = parsed.PaymentId,
            InvoiceId = parsed.InvoiceId,
            Amount = parsed.Amount,
            Currency = parsed.Currency,
            Status = parsed.Status,
            Reference = parsed.Reference,
            Source = parsed.SourceType != null
                ? new WebhookSource { Type = parsed.SourceType, TransactionId = parsed.SourceTransactionId }
                : null,
            CreatedAt = parsed.CreatedAt,
            PaidAt = parsed.PaidAt,
            Signature = parsed.Signature
        });

        return Ok(new { success = true });
    }

    // 🔒 Webhook PayPal: مُتحقَّق بالتوقيع (RSA على PAYPAL-TRANSMISSION-* headers) —
    // بدون توقيع صحيح يُرفض. لا يتطلب توكن مستخدم؛ الحماية عبر التوقيع فقط.
    [HttpPost("webhook/paypal")]
    [AllowAnonymous]
    public async Task<IActionResult> HandlePayPalWebhook()
    {
        string rawBody;
        using (var reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            rawBody = await reader.ReadToEndAsync();
        }

        if (string.IsNullOrWhiteSpace(rawBody))
            return BadRequest(new { success = false, message = "Empty webhook body" });

        var transmissionId = Request.Headers["PAYPAL-TRANSMISSION-ID"].FirstOrDefault();
        var transmissionTime = Request.Headers["PAYPAL-TRANSMISSION-TIME"].FirstOrDefault();
        var signature = Request.Headers["PAYPAL-TRANSMISSION-SIG"].FirstOrDefault();
        var certUrl = Request.Headers["PAYPAL-CERT-URL"].FirstOrDefault();
        var authAlgo = Request.Headers["PAYPAL-AUTH-ALGO"].FirstOrDefault();

        var verified = await _payPalProvider.VerifyWebhookSignatureAsync(
            rawBody,
            transmissionId ?? string.Empty,
            transmissionTime ?? string.Empty,
            signature ?? string.Empty,
            certUrl ?? string.Empty,
            authAlgo ?? string.Empty);

        if (!verified)
            return Unauthorized(new { success = false, message = "توقيع الويب هوك غير صالح" });

        PayPalWebhookData parsed;
        try
        {
            parsed = _payPalProvider.ParseWebhookJson(rawBody);
        }
        catch
        {
            return BadRequest(new { success = false, message = "Invalid webhook payload" });
        }

        if (string.IsNullOrWhiteSpace(parsed.EventType))
            return BadRequest(new { success = false, message = "Invalid webhook payload" });

        await _paymentService.HandlePayPalWebhookAsync(new PayPalWebhookPayload
        {
            EventType = parsed.EventType,
            OrderId = parsed.OrderId,
            CaptureId = parsed.CaptureId,
            Amount = parsed.Amount,
            Currency = parsed.Currency
        });

        return Ok(new { success = true });
    }
}