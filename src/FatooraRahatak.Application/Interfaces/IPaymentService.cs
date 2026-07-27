using FatooraRahatak.Application.DTOs.Payment;

namespace FatooraRahatak.Application.Interfaces;

public interface IPaymentService
{
    Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto);
    Task<PaymentStatusResult> CheckPaymentStatusAsync(string paymentReference);
    Task HandleWebhookAsync(WebhookPayload payload);
    Task<List<PaymentListDto>> GetPaymentsAsync(long storeId, string? statusFilter = null);
}