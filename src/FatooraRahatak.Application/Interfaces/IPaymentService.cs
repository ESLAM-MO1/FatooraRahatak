using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.Interfaces;

public interface IPaymentService
{
    Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto, long? storeId = null);
    Task<CreatePaymentResult> RetryOrderPaymentAsync(string slug, string orderNumber);
    Task<PaymentStatusResult> CheckPaymentStatusAsync(string paymentReference, long? storeId = null);
    Task<PaymentStatusResult> CheckOrderPaymentStatusAsync(long storeId, string orderNumber);
    Task<PaymentStatusResult> CheckOrderPaymentStatusBySlugAsync(string slug, string orderNumber);
    Task HandleWebhookAsync(WebhookPayload payload);
    Task<PagedResult<PaymentListDto>> GetPaymentsAsync(long storeId, string? statusFilter = null, int page = 1, int pageSize = 20);
    Task<PaymentStatusResult> RefundPaymentAsync(long storeId, string paymentReference);
    Task<BankTransferResult> UploadBankTransferReceiptAsync(string slug, string orderNumber, string? phone, long? customerId, string receiptUrl, string? reference);
    Task<PaymentStatusResult> ConfirmBankTransferAsync(long storeId, long orderId);
    Task<PaymentStatusResult> ConfirmPosBankTransferAsync(long storeId, string paymentReference);
    Task<PaymentStatusResult> HandlePayPalWebhookAsync(PayPalWebhookPayload payload);
    Task<PaymentStatusResult> HandleBnplWebhookAsync(long storeId, PaymentProviderType provider, string providerPaymentId);
}
