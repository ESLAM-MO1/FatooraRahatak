using System.Security.Claims;
using System.Text;
using System.Text.Json;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
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
    private readonly TamaraPaymentProvider _tamaraProvider;
    private readonly IStorePaymentCredentialService _credentialService;
    private readonly IPermissionCheckService _permCheck;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(IPaymentService paymentService, MoyasarPaymentProvider provider, PayPalPaymentProvider payPalProvider, TamaraPaymentProvider tamaraProvider, IStorePaymentCredentialService credentialService, IPermissionCheckService permCheck, ILogger<PaymentController> logger)
    {
        _paymentService = paymentService;
        _provider = provider;
        _payPalProvider = payPalProvider;
        _tamaraProvider = tamaraProvider;
        _credentialService = credentialService;
        _permCheck = permCheck;
        _logger = logger;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private Task<long?> GetStoreIdAsync() => _permCheck.GetUserStoreIdAsync(GetUserId());

    private async Task<string> ReadBodyAsync()
    {
        using var reader = new StreamReader(Request.Body, Encoding.UTF8);
        return await reader.ReadToEndAsync();
    }

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

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleWebhook()
    {
        var rawBody = await ReadBodyAsync();

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

    [HttpPost("webhook/paypal")]
    [AllowAnonymous]
    public async Task<IActionResult> HandlePayPalWebhook()
    {
        var rawBody = await ReadBodyAsync();

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

    [HttpPost("webhook/tabby/{storeId:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleTabbyWebhook(long storeId)
    {
        var rawBody = await ReadBodyAsync();
        if (string.IsNullOrWhiteSpace(rawBody))
            return BadRequest(new { success = false, message = "Empty webhook body" });

        string? paymentId = null;
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;
            if (root.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                paymentId = idEl.GetString();
            else if (root.TryGetProperty("payment", out var pEl) && pEl.TryGetProperty("id", out var pid))
                paymentId = pid.GetString();
        }
        catch
        {
            return BadRequest(new { success = false, message = "Invalid webhook payload" });
        }

        if (string.IsNullOrWhiteSpace(paymentId))
            return BadRequest(new { success = false, message = "Invalid webhook payload" });

        try
        {
            await _paymentService.HandleBnplWebhookAsync(storeId, PaymentProviderType.Tabby, paymentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tabby webhook فشل. Store={Store} Payment={Payment}", storeId, paymentId);
        }

        return Ok(new { success = true });
    }

    [HttpPost("webhook/tamara/{storeId:long}")]
    [AllowAnonymous]
    public async Task<IActionResult> HandleTamaraWebhook(long storeId)
    {
        var rawBody = await ReadBodyAsync();
        if (string.IsNullOrWhiteSpace(rawBody))
            return BadRequest(new { success = false, message = "Empty webhook body" });

        var secrets = await _credentialService.GetSecretsAsync(storeId, PaymentProviderType.Tamara);
        if (secrets == null || string.IsNullOrWhiteSpace(secrets.NotificationToken))
            return Unauthorized(new { success = false, message = "تمارا غير مفعّلة لهذا المتجر" });

        var token = Request.Query["tamaraToken"].FirstOrDefault();
        if (string.IsNullOrWhiteSpace(token))
        {
            var auth = Request.Headers["Authorization"].FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(auth) && auth.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                token = auth.Substring(7).Trim();
        }

        if (!_tamaraProvider.VerifyNotificationToken(token ?? string.Empty, secrets.NotificationToken))
            return Unauthorized(new { success = false, message = "توكن الإشعار غير صالح" });

        string? orderId = null;
        try
        {
            using var doc = JsonDocument.Parse(rawBody);
            if (doc.RootElement.TryGetProperty("order_id", out var oid) && oid.ValueKind == JsonValueKind.String)
                orderId = oid.GetString();
        }
        catch
        {
            return BadRequest(new { success = false, message = "Invalid webhook payload" });
        }

        if (string.IsNullOrWhiteSpace(orderId))
            return BadRequest(new { success = false, message = "Invalid webhook payload" });

        try
        {
            await _paymentService.HandleBnplWebhookAsync(storeId, PaymentProviderType.Tamara, orderId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Tamara webhook فشل. Store={Store} Order={Order}", storeId, orderId);
        }

        return Ok(new { success = true });
    }
}
