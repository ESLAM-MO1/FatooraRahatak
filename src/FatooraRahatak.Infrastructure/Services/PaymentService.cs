using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly MoyasarPaymentProvider _provider;

    public PaymentService(AppDbContext context, MoyasarPaymentProvider provider)
    {
        _context = context;
        _provider = provider;
    }

    public async Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto)
    {
        var result = await _provider.CreatePaymentAsync(
            dto.Amount,
            dto.Currency,
            dto.Description,
            dto.CallbackUrl,
            dto.CustomerEmail,
            dto.CustomerName,
            dto.CustomerPhone
        );

        if (!result.Success)
        {
            return new CreatePaymentResult
            {
                Success = false,
                Message = result.ErrorMessage ?? "فشل إنشاء رابط الدفع"
            };
        }

        var payment = new Payment
        {
            PaymentReference = Guid.NewGuid().ToString("N").Substring(0, 16),
            InvoiceId = dto.InvoiceId != null ? long.Parse(dto.InvoiceId) : (long?)null,
            OrderId = dto.OrderId != null ? long.Parse(dto.OrderId) : (long?)null,
            SubscriptionId = dto.SubscriptionId != null ? long.Parse(dto.SubscriptionId) : (long?)null,
            Amount = dto.Amount,
            Currency = dto.Currency,
            Status = PaymentStatus.Pending,
            ProviderType = PaymentProviderType.Moyasar,
            ProviderPaymentId = result.ProviderPaymentId,
            CallbackUrl = dto.CallbackUrl,
            GatewayResponse = result.RawResponse,
            CreatedAt = DateTime.UtcNow
        };

        _context.Payments.Add(payment);
        await _context.SaveChangesAsync();

        return new CreatePaymentResult
        {
            Success = true,
            PaymentReference = payment.PaymentReference,
            PaymentLinkUrl = result.PaymentUrl,
            ProviderPaymentId = result.ProviderPaymentId,
            Message = "تم إنشاء رابط الدفع بنجاح"
        };
    }

    public async Task<PaymentStatusResult> CheckPaymentStatusAsync(string paymentReference)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.PaymentReference == paymentReference);

        if (payment == null)
        {
            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                Status = "not_found",
                Message = "الدفعة غير موجودة"
            };
        }

        if (!string.IsNullOrWhiteSpace(payment.ProviderPaymentId))
        {
            var result = await _provider.GetPaymentStatusAsync(payment.ProviderPaymentId);

            if (result.Success)
            {
                payment.Status = MapStatus(result.Status);
                payment.GatewayResponse = result.RawResponse;
                if (result.Status == "Paid" && payment.PaidAt == null)
                    payment.PaidAt = DateTime.UtcNow;
                if (result.Status == "Failed")
                    payment.FailedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                ProviderPaymentId = payment.ProviderPaymentId,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                PaidAt = payment.PaidAt?.ToString("o"),
                Message = result.Success ? "تم جلب حالة الدفع" : result.ErrorMessage ?? "خطأ"
            };
        }

        return new PaymentStatusResult
        {
            PaymentReference = paymentReference,
            Status = payment.Status.ToString(),
            Amount = payment.Amount,
            Message = "الحالة من قاعدة البيانات"
        };
    }

    public async Task HandleWebhookAsync(WebhookPayload payload)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.ProviderPaymentId == payload.PaymentId);

        if (payment == null)
            return;

        payment.Status = MapStatus(payload.Status);
        payment.GatewayResponse = payload.Status;

        if (payment.Status == PaymentStatus.Paid)
            payment.PaidAt = DateTime.UtcNow;

        if (payment.Status == PaymentStatus.Failed)
            payment.FailedAt = DateTime.UtcNow;

        if (payment.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(payment.InvoiceId.Value);
            if (invoice != null)
            {
                invoice.PaymentStatus = payment.Status;
            }
        }

        if (payment.OrderId.HasValue)
        {
            var order = await _context.Orders.FindAsync(payment.OrderId.Value);
            if (order != null)
            {
                order.PaymentStatus = payment.Status;
                if (payment.Status == PaymentStatus.Paid && order.Status == OrderStatus.New)
                    order.Status = OrderStatus.Processing;
            }
        }

        if (payment.SubscriptionId.HasValue)
        {
            var subscription = await _context.Subscriptions.FindAsync(payment.SubscriptionId.Value);
            if (subscription != null)
            {
                subscription.PaymentStatus = payment.Status.ToString();
            }
        }

        await _context.SaveChangesAsync();
    }

    public async Task<List<PaymentListDto>> GetPaymentsAsync(long storeId, string? statusFilter = null)
    {
        var query = _context.Payments
            .Where(p => p.Invoice != null && p.Invoice.StoreId == storeId
                     || p.Order != null && p.Order.StoreId == storeId
                     || p.Subscription != null && p.Subscription.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(statusFilter) && Enum.TryParse<PaymentStatus>(statusFilter, out var statusEnum))
            query = query.Where(p => p.Status == statusEnum);

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PaymentListDto
            {
                Id = p.Id,
                PaymentReference = p.PaymentReference,
                Amount = p.Amount,
                Currency = p.Currency,
                Status = p.Status.ToString(),
                ProviderPaymentId = p.ProviderPaymentId,
                InvoiceId = p.InvoiceId,
                OrderId = p.OrderId,
                SubscriptionId = p.SubscriptionId,
                PaidAt = p.PaidAt,
                FailedAt = p.FailedAt,
                RefundedAt = p.RefundedAt,
                CreatedAt = p.CreatedAt,
            })
            .ToListAsync();
    }

    private static PaymentStatus MapStatus(string providerStatus)
    {
        return providerStatus?.ToLower() switch
        {
            "paid" or "completed" or "successful" => PaymentStatus.Paid,
            "pending" or "processing" => PaymentStatus.Pending,
            "failed" or "declined" or "refused" => PaymentStatus.Failed,
            "refunded" or "partially_refunded" => PaymentStatus.Refunded,
            _ => PaymentStatus.Pending
        };
    }
}