using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/payments")]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpPost("create-link")]
    public async Task<IActionResult> CreatePaymentLink([FromBody] CreatePaymentDto dto)
    {
        var result = await _paymentService.CreatePaymentLinkAsync(dto);
        if (!result.Success)
            return BadRequest(new { success = false, message = result.Message });

        return Ok(new { success = true, data = result });
    }

    [HttpGet("status/{paymentReference}")]
    public async Task<IActionResult> CheckPaymentStatus(string paymentReference)
    {
        var result = await _paymentService.CheckPaymentStatusAsync(paymentReference);
        return Ok(new { success = true, data = result });
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> HandleWebhook([FromBody] WebhookPayload payload)
    {
        if (payload == null || string.IsNullOrWhiteSpace(payload.Status))
            return BadRequest(new { success = false, message = "Invalid webhook payload" });

        await _paymentService.HandleWebhookAsync(payload);
        return Ok(new { success = true });
    }
}