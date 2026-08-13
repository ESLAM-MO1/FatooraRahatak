using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Payment;

namespace FatooraRahatak.Application.Interfaces;

public interface IPaymentService
{
    Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto, long? storeId = null);
    Task<PaymentStatusResult> CheckPaymentStatusAsync(string paymentReference, long? storeId = null);
    Task<PaymentStatusResult> CheckOrderPaymentStatusAsync(long storeId, string orderNumber);
    Task<PaymentStatusResult> CheckOrderPaymentStatusBySlugAsync(string slug, string orderNumber);
    Task HandleWebhookAsync(WebhookPayload payload);
    Task<PagedResult<PaymentListDto>> GetPaymentsAsync(long storeId, string? statusFilter = null, int page = 1, int pageSize = 20);
    Task<PaymentStatusResult> RefundPaymentAsync(long storeId, string paymentReference);
    Task<StorePaymentAccountDto?> GetStorePaymentAccountAsync(long storeId);
    Task<StorePaymentAccountDto> SubmitStorePaymentAccountAsync(long storeId, SubmitStorePaymentAccountDto dto);
    Task<BankTransferResult> UploadBankTransferReceiptAsync(string slug, string orderNumber, string? phone, long? customerId, string receiptUrl, string? reference);
    Task<PaymentStatusResult> ConfirmBankTransferAsync(long storeId, long orderId);
    Task<PaymentStatusResult> HandlePayPalWebhookAsync(PayPalWebhookPayload payload);
}