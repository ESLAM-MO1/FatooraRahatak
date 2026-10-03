using System.Text.Json;
using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Affiliates;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace FatooraRahatak.Infrastructure.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _context;
    private readonly MoyasarPaymentProvider _provider;
    private readonly PayPalPaymentProvider _payPalProvider;
    private readonly TabbyPaymentProvider _tabbyProvider;
    private readonly TamaraPaymentProvider _tamaraProvider;
    private readonly IStorePaymentCredentialService _credentialService;
    private readonly ISubscriptionService _subscriptionService;
    private readonly IAccountingService _accountingService;
    private readonly IOrderStockService _orderStockService;
    private readonly INotificationService _notificationService;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentService> _logger;
    private readonly IEmailService _emailService;

    public PaymentService(AppDbContext context, MoyasarPaymentProvider provider, PayPalPaymentProvider payPalProvider, TabbyPaymentProvider tabbyProvider, TamaraPaymentProvider tamaraProvider, IStorePaymentCredentialService credentialService, ISubscriptionService subscriptionService, IAccountingService accountingService, IOrderStockService orderStockService, INotificationService notificationService, IConfiguration config, ILogger<PaymentService> logger, IEmailService emailService)
    {
        _context = context;
        _provider = provider;
        _payPalProvider = payPalProvider;
        _tabbyProvider = tabbyProvider;
        _tamaraProvider = tamaraProvider;
        _credentialService = credentialService;
        _subscriptionService = subscriptionService;
        _accountingService = accountingService;
        _orderStockService = orderStockService;
        _notificationService = notificationService;
        _config = config;
        _logger = logger;
        _emailService = emailService;
    }

    private sealed class ProviderStatus
    {
        public bool Success { get; set; }
        public string Status { get; set; } = "Pending";
        public string? RawResponse { get; set; }
        public string? ErrorMessage { get; set; }
        public string? ProviderCaptureId { get; set; }
    }

    private sealed class RefundOutcome
    {
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
        public string? RawResponse { get; set; }
    }

    private static ProviderStatus Fail(string message) => new() { Success = false, ErrorMessage = message };

    private static string? ExtractJsonString(string? json, string property)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.TryGetProperty(property, out var el) && el.ValueKind == JsonValueKind.String
                ? el.GetString()
                : null;
        }
        catch
        {
            return null;
        }
    }

    private string ToAbsoluteStoreUrl(string? url)
    {
        var value = url ?? "";
        if (string.IsNullOrWhiteSpace(value)) return value;
        var baseUrl = _config["App:StoreFrontBaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = _config["App:BaseUrl"];
        if (string.IsNullOrWhiteSpace(baseUrl)) baseUrl = "http://localhost:3000";
        baseUrl = baseUrl.TrimEnd('/');
        if (value.StartsWith('/')) return baseUrl + value;
        if (!value.Contains("://")) return baseUrl + "/" + value;
        return value;
    }

    private async Task<long?> ResolveStoreIdAsync(Payment payment)
    {
        if (payment.Order != null) return payment.Order.StoreId;
        if (!payment.OrderId.HasValue) return payment.PosShiftStoreId;
        return await _context.Orders
            .Where(o => o.Id == payment.OrderId.Value)
            .Select(o => (long?)o.StoreId)
            .FirstOrDefaultAsync();
    }

    private async Task<ProviderStatus> GetProviderStatusAsync(Payment payment)
    {
        var providerId = payment.ProviderPaymentId!;
        switch (payment.ProviderType)
        {
            case PaymentProviderType.PayPal:
            {
                var r = await _payPalProvider.GetOrderStatusAsync(providerId);
                return new ProviderStatus
                {
                    Success = r.Success,
                    Status = r.Status,
                    RawResponse = r.RawResponse,
                    ErrorMessage = r.ErrorMessage,
                    ProviderCaptureId = r.ProviderCaptureId
                };
            }
            case PaymentProviderType.Tabby:
                return await GetTabbyStatusAsync(payment);
            case PaymentProviderType.Tamara:
                return await GetTamaraStatusAsync(payment);
            default:
            {
                var r = await _provider.GetPaymentStatusAsync(providerId);
                return new ProviderStatus
                {
                    Success = r.Success,
                    Status = r.Status,
                    RawResponse = r.RawResponse,
                    ErrorMessage = r.ErrorMessage
                };
            }
        }
    }

    private async Task<ProviderStatus> GetTabbyStatusAsync(Payment payment)
    {
        var storeId = await ResolveStoreIdAsync(payment);
        if (storeId == null) return Fail("المتجر غير معروف لهذه الدفعة");

        var secrets = await _credentialService.GetSecretsAsync(storeId.Value, PaymentProviderType.Tabby);
        if (secrets == null || string.IsNullOrWhiteSpace(secrets.SecretKey))
            return Fail("بيانات تابي غير متوفرة للتاجر");

        var result = await _tabbyProvider.GetPaymentStatusAsync(secrets.SecretKey, payment.ProviderPaymentId!);
        if (!result.Success)
            return new ProviderStatus { Success = false, ErrorMessage = result.ErrorMessage, RawResponse = result.RawResponse };

        var status = result.Status;
        var rawStatus = ExtractJsonString(result.RawResponse, "status");
        if (string.Equals(rawStatus, "AUTHORIZED", StringComparison.OrdinalIgnoreCase))
        {
            var capture = await _tabbyProvider.CapturePaymentAsync(secrets.SecretKey, payment.ProviderPaymentId!, payment.Amount);
            if (!capture.Success)
                return new ProviderStatus { Success = false, ErrorMessage = capture.ErrorMessage, RawResponse = capture.RawResponse };
            status = "Paid";
        }

        return new ProviderStatus { Success = true, Status = status, RawResponse = result.RawResponse };
    }

    private async Task<ProviderStatus> GetTamaraStatusAsync(Payment payment)
    {
        var storeId = await ResolveStoreIdAsync(payment);
        if (storeId == null) return Fail("المتجر غير معروف لهذه الدفعة");

        var secrets = await _credentialService.GetSecretsAsync(storeId.Value, PaymentProviderType.Tamara);
        if (secrets == null || string.IsNullOrWhiteSpace(secrets.SecretKey))
            return Fail("بيانات تمارا غير متوفرة للتاجر");

        var orderId = payment.ProviderPaymentId!;
        var result = await _tamaraProvider.GetOrderStatusAsync(secrets.SecretKey, secrets.IsTestMode, orderId);
        if (!result.Success)
            return new ProviderStatus { Success = false, ErrorMessage = result.ErrorMessage, RawResponse = result.RawResponse };

        var raw = result.RawStatus?.ToLowerInvariant();
        var status = result.Status;

        if (raw == "approved")
        {
            var auth = await _tamaraProvider.AuthoriseOrderAsync(secrets.SecretKey, secrets.IsTestMode, orderId);
            if (!auth.Success)
                return new ProviderStatus { Success = false, ErrorMessage = auth.ErrorMessage, RawResponse = auth.RawResponse };
            raw = "authorised";
        }

        if (raw == "authorised" || raw == "authorized")
        {
            var capture = await _tamaraProvider.CaptureOrderAsync(secrets.SecretKey, secrets.IsTestMode, orderId, payment.Amount, payment.Currency, payment.PaymentReference);
            if (!capture.Success)
                return new ProviderStatus { Success = false, ErrorMessage = capture.ErrorMessage, RawResponse = capture.RawResponse };
            status = "Paid";
        }

        return new ProviderStatus { Success = true, Status = status, RawResponse = result.RawResponse };
    }

    public async Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto, long? storeId = null)
    {
        if (dto.Amount <= 0)
            return new CreatePaymentResult { Success = false, Message = "مبلغ الدفع غير صالح" };

        if (!dto.SubscriptionId.HasValue && !dto.OrderId.HasValue && !dto.InvoiceId.HasValue
            && string.IsNullOrWhiteSpace(dto.PendingPosPayloadJson))
            return new CreatePaymentResult { Success = false, Message = "يجب تحديد مرجع الدفع (طلب أو فاتورة أو اشتراك)" };

        if (dto.SubscriptionId.HasValue)
        {
            var subscription = await _context.Subscriptions.FindAsync(dto.SubscriptionId.Value);
            if (subscription == null)
                return new CreatePaymentResult { Success = false, Message = "الاشتراك غير موجود" };
            if (storeId.HasValue && subscription.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الاشتراك غير موجود" };
            if (subscription.PaymentStatus == "Paid")
                return new CreatePaymentResult { Success = false, Message = "هذا الاشتراك مدفوع بالفعل" };
            if (subscription.Status != SubscriptionStatus.Pending)
                return new CreatePaymentResult { Success = false, Message = "لا يمكن دفع اشتراك غير معلّق" };
            if (!AreAmountsEqual(dto.Amount, subscription.DueAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {subscription.DueAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        Order? order = null;
        if (dto.OrderId.HasValue)
        {
            order = await _context.Orders
                .Include(o => o.Store)
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId.Value);
            if (order == null)
                return new CreatePaymentResult { Success = false, Message = "الطلب غير موجود" };
            if (storeId.HasValue && order.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الطلب غير موجود" };
            if (!AreAmountsEqual(dto.Amount, order.TotalAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {order.TotalAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        if (dto.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(dto.InvoiceId.Value);
            if (invoice == null)
                return new CreatePaymentResult { Success = false, Message = "الفاتورة غير موجودة" };
            if (storeId.HasValue && invoice.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الفاتورة غير موجودة" };
            if (!AreAmountsEqual(dto.Amount, invoice.TotalAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {invoice.TotalAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        PaymentProviderType providerType = PaymentProviderType.Moyasar;
        PayPalPaymentResult? payPalResult = null;
        MoyasarPaymentResult? moyasarResult = null;
        TabbyPaymentResult? tabbyResult = null;
        TamaraPaymentResult? tamaraResult = null;
        BankTransferInfoDto? bankTransferInfo = null;

        var description = string.IsNullOrWhiteSpace(dto.Description)
            ? BuildPaymentDescription(dto)
            : dto.Description;

        var baseUrl = (_config["App:BaseUrl"] ?? "https://your-domain.com").TrimEnd('/');
        var paymentCallbackUrl = baseUrl + "/api/v1/payments/webhook";

        _logger.LogInformation("CreatePaymentLink Order={Order} Inv={Inv} Sub={Sub} Amount={Amount} Currency={Currency}", dto.OrderId, dto.InvoiceId, dto.SubscriptionId, dto.Amount, dto.Currency);

        if (order != null)
        {
            if (order.PaymentMethodType == PaymentMethodType.PayPal)
                providerType = PaymentProviderType.PayPal;
            else if (order.PaymentMethodType == PaymentMethodType.Tabby)
                providerType = PaymentProviderType.Tabby;
            else if (order.PaymentMethodType == PaymentMethodType.Tamara)
                providerType = PaymentProviderType.Tamara;
        }
        else if (!string.IsNullOrWhiteSpace(dto.PaymentMethod))
        {
            providerType = dto.PaymentMethod.Trim().ToLowerInvariant() switch
            {
                "banktransfer" or "bank_transfer" => PaymentProviderType.BankTransfer,
                "paypal" => PaymentProviderType.PayPal,
                "tabby" => PaymentProviderType.Tabby,
                "tamara" => PaymentProviderType.Tamara,
                _ => PaymentProviderType.Moyasar
            };
        }

        var isBnpl = providerType == PaymentProviderType.Tabby || providerType == PaymentProviderType.Tamara;
        long? bnplStoreId = order?.StoreId ?? storeId ?? dto.PosShiftStoreId;
        if (isBnpl && (dto.SubscriptionId.HasValue || dto.InvoiceId.HasValue || bnplStoreId == null))
            return new CreatePaymentResult { Success = false, Message = "تابي وتمارا متاحان لطلبات المتجر ونقطة البيع فقط" };
        var bnplReferenceId = order != null ? order.OrderNumber : "POS-" + Guid.NewGuid().ToString("N").Substring(0, 12);
        var bnplReturnUrl = string.IsNullOrWhiteSpace(dto.SuccessUrl) ? ToAbsoluteStoreUrl("/dashboard") : ToAbsoluteStoreUrl(dto.SuccessUrl);

        if (providerType == PaymentProviderType.PayPal)
        {
            payPalResult = await _payPalProvider.CreateOrderAsync(
                dto.Amount,
                dto.Currency,
                description,
                dto.SuccessUrl,
                dto.CallbackUrl);

            if (!payPalResult.Success)
            {
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = payPalResult.ErrorMessage ?? "فشل إنشاء رابط الدفع عبر PayPal"
                };
            }
        }
        else if (providerType == PaymentProviderType.Tabby)
        {
            var secrets = await _credentialService.GetSecretsAsync(bnplStoreId!.Value, PaymentProviderType.Tabby);
            if (secrets == null || !secrets.IsEnabled
                || string.IsNullOrWhiteSpace(secrets.SecretKey)
                || string.IsNullOrWhiteSpace(secrets.MerchantCode))
                return new CreatePaymentResult { Success = false, Message = "التاجر لم يفعّل الدفع عبر تابي" };

            var returnUrl = bnplReturnUrl;
            tabbyResult = await _tabbyProvider.CreateCheckoutSessionAsync(
                secrets.SecretKey,
                secrets.MerchantCode,
                dto.Amount,
                dto.Currency,
                description,
                bnplReferenceId,
                returnUrl,
                returnUrl,
                dto.CustomerEmail,
                dto.CustomerName,
                dto.CustomerPhone);

            if (!tabbyResult.Success)
            {
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = tabbyResult.ErrorMessage ?? "فشل إنشاء رابط الدفع عبر تابي"
                };
            }
        }
        else if (providerType == PaymentProviderType.Tamara)
        {
            var secrets = await _credentialService.GetSecretsAsync(bnplStoreId!.Value, PaymentProviderType.Tamara);
            if (secrets == null || !secrets.IsEnabled || string.IsNullOrWhiteSpace(secrets.SecretKey))
                return new CreatePaymentResult { Success = false, Message = "التاجر لم يفعّل الدفع عبر تمارا" };

            var returnUrl = bnplReturnUrl;
            var notificationUrl = $"{baseUrl}/api/v1/payments/webhook/tamara/{bnplStoreId}";
            tamaraResult = await _tamaraProvider.CreateCheckoutSessionAsync(
                secrets.SecretKey,
                secrets.IsTestMode,
                dto.Amount,
                dto.Currency,
                description,
                bnplReferenceId,
                returnUrl,
                returnUrl,
                notificationUrl,
                dto.CustomerEmail,
                dto.CustomerName,
                dto.CustomerPhone);

            if (!tamaraResult.Success)
            {
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = tamaraResult.ErrorMessage ?? "فشل إنشاء رابط الدفع عبر تمارا"
                };
            }
        }
        else if (providerType == PaymentProviderType.BankTransfer)
        {
            if (dto.SubscriptionId.HasValue)
            {
                var platformBank = await GetPlatformBankAccountAsync();
                if (platformBank == null || string.IsNullOrWhiteSpace(platformBank.Iban))
                {
                    return new CreatePaymentResult
                    {
                        Success = false,
                        Message = "لم يُضبط حساب المنصة البنكي للاستقبال بعد — يرجى التواصل مع الدعم"
                    };
                }
                bankTransferInfo = platformBank;
            }
            else
            {
                if (order != null)
                {
                    var storeForBank = order.Store;
                    bankTransferInfo = new BankTransferInfoDto
                    {
                        BankName = storeForBank?.PayoutBankName,
                        AccountHolder = storeForBank?.PayoutAccountHolder,
                        Iban = storeForBank?.PayoutIban
                    };

                    if (string.IsNullOrWhiteSpace(storeForBank?.PayoutIban))
                    {
                        return new CreatePaymentResult
                        {
                            Success = false,
                            Message = "لم يُضبط حساب بنكي للاستقبال في إعدادات المتجر بعد — يرجى التواصل مع المتجر"
                        };
                    }
                }
                else if (storeId.HasValue)
                {
                    var merchantBank = await _context.Set<FatooraRahatak.Domain.Entities.Settlement.MerchantBankDetails>()
                        .FirstOrDefaultAsync(m => m.StoreId == storeId.Value && m.IsActive);

                    bankTransferInfo = new BankTransferInfoDto
                    {
                        BankName = merchantBank?.BankName,
                        AccountHolder = merchantBank?.AccountHolderName,
                        Iban = merchantBank?.Iban
                    };

                    if (merchantBank == null || string.IsNullOrWhiteSpace(merchantBank.Iban))
                    {
                        return new CreatePaymentResult
                        {
                            Success = false,
                            Message = "لم يُضبط حساب بنكي للاستقبال بعد — أضفه من صفحة التسويات المالية أولاً"
                        };
                    }
                }
            }
        }
        else
        {
            if (!string.IsNullOrWhiteSpace(dto.CardNumber))
            {
                moyasarResult = await _provider.CreatePaymentAsync(
                    dto.Amount,
                    dto.Currency,
                    description,
                    dto.CallbackUrl,
                    dto.CustomerEmail,
                    dto.CustomerName,
                    dto.CustomerPhone,
                    recipientId: null,
                    cardHolder: dto.CardHolder,
                    cardNumber: dto.CardNumber,
                    cardExpiryMonth: dto.CardExpiryMonth,
                    cardExpiryYear: dto.CardExpiryYear,
                    cardCvc: dto.CardCvc);
            }
            else
            {
                var fullSuccessUrl = ToAbsoluteStoreUrl(dto.SuccessUrl);

                moyasarResult = await _provider.CreateInvoiceAsync(
                    dto.Amount,
                    dto.Currency,
                    description,
                    paymentCallbackUrl,
                    fullSuccessUrl,
                    fullSuccessUrl,
                    dto.CustomerEmail);
            }

            if (!moyasarResult.Success)
            {
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = moyasarResult.ErrorMessage ?? "فشل إنشاء رابط الدفع"
                };
            }
        }

        var providerPaymentId = providerType == PaymentProviderType.PayPal ? payPalResult!.ProviderPaymentId
            : providerType == PaymentProviderType.Moyasar ? moyasarResult!.ProviderPaymentId
            : providerType == PaymentProviderType.Tabby ? tabbyResult!.ProviderPaymentId
            : providerType == PaymentProviderType.Tamara ? tamaraResult!.ProviderPaymentId
            : null;
        var gatewayResponse = providerType == PaymentProviderType.PayPal ? payPalResult!.RawResponse
            : providerType == PaymentProviderType.Moyasar ? moyasarResult!.RawResponse
            : providerType == PaymentProviderType.Tabby ? tabbyResult!.RawResponse
            : providerType == PaymentProviderType.Tamara ? tamaraResult!.RawResponse
            : null;
        var paymentLinkUrl = providerType == PaymentProviderType.PayPal ? payPalResult!.PaymentUrl
            : providerType == PaymentProviderType.Moyasar ? moyasarResult!.PaymentUrl
            : providerType == PaymentProviderType.Tabby ? tabbyResult!.PaymentUrl
            : providerType == PaymentProviderType.Tamara ? tamaraResult!.PaymentUrl
            : null;

        var effectivePosShiftStoreId = dto.PosShiftStoreId ?? (isBnpl && order == null ? bnplStoreId : null);
        Payment payment;
        Payment? existingPayment = null;
        if (dto.SubscriptionId.HasValue)
            existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.SubscriptionId == dto.SubscriptionId);
        else if (dto.OrderId.HasValue)
            existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.OrderId == dto.OrderId);
        else if (dto.InvoiceId.HasValue)
            existingPayment = await _context.Payments.FirstOrDefaultAsync(p => p.InvoiceId == dto.InvoiceId);

        if (existingPayment != null)
        {
            if (existingPayment.Status == PaymentStatus.Paid || existingPayment.Status == PaymentStatus.Refunded)
                return new CreatePaymentResult { Success = false, Message = "هذه الدفعة مكتملة بالفعل" };

            existingPayment.ProviderType = providerType;
            existingPayment.ProviderPaymentId = providerPaymentId;
            existingPayment.CallbackUrl = dto.CallbackUrl;
            existingPayment.GatewayResponse = gatewayResponse;
            existingPayment.Amount = dto.Amount;
            existingPayment.Currency = dto.Currency;
            existingPayment.Status = PaymentStatus.Pending;
            existingPayment.PendingPosPayloadJson = dto.PendingPosPayloadJson;
            existingPayment.PosShiftStoreId = effectivePosShiftStoreId;
            existingPayment.UpdatedAt = DateTime.UtcNow;
            payment = existingPayment;
        }
        else
        {
            payment = new Payment
            {
                PaymentReference = Guid.NewGuid().ToString("N").Substring(0, 16),
                InvoiceId = dto.InvoiceId,
                OrderId = dto.OrderId,
                SubscriptionId = dto.SubscriptionId,
                Amount = dto.Amount,
                Currency = dto.Currency,
                Status = PaymentStatus.Pending,
                ProviderType = providerType,
                ProviderPaymentId = providerPaymentId,
                CallbackUrl = dto.CallbackUrl,
                GatewayResponse = gatewayResponse,
                PendingPosPayloadJson = dto.PendingPosPayloadJson,
                PosShiftStoreId = effectivePosShiftStoreId,
                CreatedAt = DateTime.UtcNow
            };
            _context.Payments.Add(payment);
        }

        await _context.SaveChangesAsync();

        return new CreatePaymentResult
        {
            Success = true,
            PaymentReference = payment.PaymentReference,
            PaymentLinkUrl = paymentLinkUrl,
            ProviderPaymentId = payment.ProviderPaymentId,
            BankTransfer = bankTransferInfo,
            Message = providerType == PaymentProviderType.BankTransfer
                ? "تم إنشاء الطلب — يُرجى إتمام الحوالة البنكية وإرسال إيصال التحويل"
                : "تم إنشاء رابط الدفع بنجاح"
        };
    }

    public async Task<PaymentStatusResult> CheckPaymentStatusAsync(string paymentReference, long? storeId = null)
    {
        var payment = await _context.Payments
            .Include(p => p.Invoice)
            .Include(p => p.Order)
            .Include(p => p.Subscription)
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

        if (storeId.HasValue)
        {
            var belongsToStore = (payment.Invoice != null && payment.Invoice.StoreId == storeId.Value)
                || (payment.Order != null && payment.Order.StoreId == storeId.Value)
                || (payment.Subscription != null && payment.Subscription.StoreId == storeId.Value);
            if (!belongsToStore)
            {
                return new PaymentStatusResult
                {
                    PaymentReference = paymentReference,
                    Status = "not_found",
                    Message = "الدفعة غير موجودة"
                };
            }
        }

        if (!string.IsNullOrWhiteSpace(payment.ProviderPaymentId))
        {
            var providerStatus = await GetProviderStatusAsync(payment);

            if (providerStatus.Success)
            {
                var mappedStatus = MapStatus(providerStatus.Status);
                if (AllowStatusTransition(payment.Status, mappedStatus))
                {
                    payment.Status = mappedStatus;
                    if (mappedStatus == PaymentStatus.Paid && payment.PaidAt == null)
                        payment.PaidAt = DateTime.UtcNow;
                    if (mappedStatus == PaymentStatus.Failed)
                        payment.FailedAt = DateTime.UtcNow;
                }
                payment.GatewayResponse = providerStatus.RawResponse;

                await ApplyPaymentSideEffectsAsync(payment);
            }
            else
            {
                _logger.LogWarning("فحص حالة الدفعة {Ref} فشل: {Error}", payment.PaymentReference, providerStatus.ErrorMessage);
            }

            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                ProviderPaymentId = payment.ProviderPaymentId,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                PaidAt = payment.PaidAt?.ToString("o"),
                Message = providerStatus.Success ? "تم جلب حالة الدفع" : providerStatus.ErrorMessage ?? "خطأ"
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

    public async Task<PaymentStatusResult> CheckOrderPaymentStatusBySlugAsync(string slug, string orderNumber)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreSlug == slug);
        if (store == null)
        {
            return new PaymentStatusResult
            {
                Status = "not_found",
                Message = "المتجر غير موجود"
            };
        }

        return await CheckOrderPaymentStatusAsync(store.Id, orderNumber);
    }

    public async Task<CreatePaymentResult> RetryOrderPaymentAsync(string slug, string orderNumber)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreSlug == slug);
        if (store == null)
            return new CreatePaymentResult { Success = false, Message = "المتجر غير موجود" };

        var order = await _context.Orders
            .Include(o => o.Store)
            .FirstOrDefaultAsync(o => o.StoreId == store.Id && o.OrderNumber == orderNumber);
        if (order == null)
            return new CreatePaymentResult { Success = false, Message = "الطلب غير موجود" };

        if (order.Status != OrderStatus.PendingPayment)
            return new CreatePaymentResult { Success = false, Message = "لا يمكن إعادة الدفع لهذا الطلب" };

        if (order.PaymentMethodType is not (PaymentMethodType.CreditCard or PaymentMethodType.PayPal or PaymentMethodType.Mada or PaymentMethodType.Tabby or PaymentMethodType.Tamara or PaymentMethodType.Moyasar))
            return new CreatePaymentResult { Success = false, Message = "طريقة الدفع لهذا الطلب لا تدعم إعادة المحاولة" };

        var storeFrontBase = (_config["App:StoreFrontBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
        var successUrl = $"{storeFrontBase}/store/{slug}/thank-you/{order.OrderNumber}";
        var paymentCallbackUrl = (_config["App:BaseUrl"] ?? "https://your-domain.com").TrimEnd('/') + "/api/v1/payments/webhook";

        return await CreatePaymentLinkAsync(new CreatePaymentDto
        {
            OrderId = order.Id,
            Amount = order.TotalAmount,
            Currency = string.IsNullOrWhiteSpace(order.Store!.Currency) ? "SAR" : order.Store!.Currency,
            Description = $"دفع الطلب {order.OrderNumber}",
            SuccessUrl = successUrl,
            CallbackUrl = paymentCallbackUrl
        }, store.Id);
    }

    public async Task<PaymentStatusResult> CheckOrderPaymentStatusAsync(long storeId, string orderNumber)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.StoreId == storeId && o.OrderNumber == orderNumber);
        if (order == null)
        {
            return new PaymentStatusResult
            {
                Status = "not_found",
                Message = "الطلب غير موجود"
            };
        }

        var payment = await _context.Payments
            .Include(p => p.Order)
            .Where(p => p.OrderId == order.Id && !string.IsNullOrWhiteSpace(p.ProviderPaymentId))
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (payment == null)
        {
            return new PaymentStatusResult
            {
                Status = "not_found",
                Message = "لا يوجد دفع إلكتروني لهذا الطلب"
            };
        }

        var result = await GetProviderStatusAsync(payment);

        if (result.Success
            && payment.ProviderType == PaymentProviderType.PayPal
            && string.Equals(result.Status, "Pending", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(result.ProviderCaptureId))
        {
            var captured = await _payPalProvider.CaptureOrderAsync(payment.ProviderPaymentId!);
            if (captured.Success)
            {
                payment.ProviderCaptureId = captured.ProviderCaptureId;
                result = new ProviderStatus
                {
                    Success = captured.Success,
                    Status = captured.Status,
                    RawResponse = captured.RawResponse,
                    ErrorMessage = captured.ErrorMessage,
                    ProviderCaptureId = captured.ProviderCaptureId
                };
            }
        }

        if (result.Success)
        {
            var mappedStatus = MapStatus(result.Status);
            if (AllowStatusTransition(payment.Status, mappedStatus))
            {
                payment.Status = mappedStatus;
                if (mappedStatus == PaymentStatus.Paid && payment.PaidAt == null)
                    payment.PaidAt = DateTime.UtcNow;
                if (mappedStatus == PaymentStatus.Failed)
                    payment.FailedAt = DateTime.UtcNow;
            }
            payment.GatewayResponse = result.RawResponse;

            await ApplyPaymentSideEffectsAsync(payment);
        }
        else
        {
            _logger.LogWarning("فحص حالة دفع الطلب {Order} فشل: {Error}", orderNumber, result.ErrorMessage);
        }

        return new PaymentStatusResult
        {
            PaymentReference = payment.PaymentReference,
            ProviderPaymentId = payment.ProviderPaymentId,
            Status = payment.Status.ToString(),
            Amount = payment.Amount,
            PaidAt = payment.PaidAt?.ToString("o"),
            Message = result.Success ? "تم جلب حالة الدفع" : result.ErrorMessage ?? "خطأ"
        };
    }

    public async Task<PaymentStatusResult> HandleBnplWebhookAsync(long storeId, PaymentProviderType provider, string providerPaymentId)
    {
        if (string.IsNullOrWhiteSpace(providerPaymentId))
            return new PaymentStatusResult { Status = "not_found", Message = "بيانات غير كافية" };

        var payment = await _context.Payments
            .Include(p => p.Order)
            .FirstOrDefaultAsync(p => p.ProviderType == provider
                                   && p.ProviderPaymentId == providerPaymentId
                                   && ((p.Order != null && p.Order.StoreId == storeId)
                                       || p.PosShiftStoreId == storeId));

        if (payment == null)
            return new PaymentStatusResult { Status = "not_found", Message = "الدفعة غير موجودة" };

        return await CheckPaymentStatusAsync(payment.PaymentReference);
    }

    public async Task HandleWebhookAsync(WebhookPayload payload)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.ProviderType == PaymentProviderType.Moyasar
                                   && (p.ProviderPaymentId == payload.PaymentId
                                       || (payload.InvoiceId != null && p.ProviderPaymentId == payload.InvoiceId)));

        if (payment == null)
            return;

        var mappedStatus = MapStatus(payload.Status);
        if (mappedStatus == PaymentStatus.Paid && !AreAmountsEqual(payload.Amount, payment.Amount))
        {
            payment.GatewayResponse = $"عدم تطابق المبلغ: المطلوب {payment.Amount:0.##} والمستلم {payload.Amount:0.##} — لم تُعتبر الدفعة مكتملة";
            await _context.SaveChangesAsync();
            return;
        }

        payment.GatewayResponse = payload.Status;

        if (AllowStatusTransition(payment.Status, mappedStatus))
        {
            payment.Status = mappedStatus;

            if (payment.Status == PaymentStatus.Paid)
                payment.PaidAt = DateTime.UtcNow;

            if (payment.Status == PaymentStatus.Failed)
                payment.FailedAt = DateTime.UtcNow;
        }

        await ApplyPaymentSideEffectsAsync(payment);
    }

    private async Task ApplyPaymentSideEffectsAsync(Payment payment)
    {
        if (!string.IsNullOrWhiteSpace(payment.PendingPosPayloadJson)
            && payment.Status == PaymentStatus.Paid)
        {
            try
            {
                using var payloadDoc = JsonDocument.Parse(payment.PendingPosPayloadJson);
                var root = payloadDoc.RootElement;

                var posUserId = root.TryGetProperty("userId", out var uid) ? uid.GetInt64() : 0L;
                var guestName = root.TryGetProperty("guestName", out var g) ? g.GetString() : null;
                var posMethod = root.TryGetProperty("paymentMethod", out var pm) ? pm.GetString() : "Mada";
                var items = new List<CreatePosSaleDtoItem>();

                if (root.TryGetProperty("items", out var itemsEl) && itemsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var it in itemsEl.EnumerateArray())
                    {
                        items.Add(new CreatePosSaleDtoItem
                        {
                            ProductId = it.TryGetProperty("ProductId", out var p1) ? p1.GetInt64()
                                : it.TryGetProperty("productId", out var p2) ? p2.GetInt64() : 0L,
                            VariantId = it.TryGetProperty("VariantId", out var v1) && v1.ValueKind != JsonValueKind.Null ? v1.GetInt64()
                                : it.TryGetProperty("variantId", out var v2) && v2.ValueKind != JsonValueKind.Null ? v2.GetInt64() : null,
                            Quantity = it.TryGetProperty("Quantity", out var q1) ? q1.GetInt32()
                                : it.TryGetProperty("quantity", out var q2) ? q2.GetInt32() : 0,
                            DiscountAmount = it.TryGetProperty("DiscountAmount", out var d1) && d1.ValueKind == JsonValueKind.Number ? d1.GetDecimal()
                                : it.TryGetProperty("discountAmount", out var d2) && d2.ValueKind == JsonValueKind.Number ? d2.GetDecimal() : 0m
                        });
                    }
                }

                if (items.Count > 0 && posUserId > 0)
                {
                    var posSale = await _accountingService.CreatePosSaleAsync(posUserId, new CreatePosSaleDto
                    {
                        GuestName = guestName,
                        PaymentMethod = posMethod,
                        Items = items.Select(i => new CreateInvoiceItemDto
                        {
                            ProductId = i.ProductId,
                            VariantId = i.VariantId,
                            Quantity = i.Quantity,
                            UnitPrice = 0m,
                            DiscountAmount = i.DiscountAmount
                        }).ToList()
                    });

                    await _context.Set<PosShift>()
                        .Where(s => s.StoreId == payment.PosShiftStoreId && s.ClosedAt == null)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.TotalSales, s => s.TotalSales + posSale.TotalAmount)
                            .SetProperty(s => s.TotalCardSales, s => s.TotalCardSales + posSale.TotalAmount));

                    payment.PendingPosPayloadJson = null;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "فشل إنشاء فاتورة POS عند تأكيد الدفع {ref}", payment.PaymentReference);
            }
        }

        if (!payment.InvoiceId.HasValue && !payment.OrderId.HasValue && !payment.SubscriptionId.HasValue)
            return;

        await using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (payment.InvoiceId.HasValue)
            {
                var invoice = await _context.Invoices
                    .Include(i => i.Store)
                    .Include(i => i.Customer)
                    .FirstOrDefaultAsync(i => i.Id == payment.InvoiceId.Value);
                if (invoice != null)
                {
                    invoice.PaymentStatus = payment.Status;

                    if (payment.Status == PaymentStatus.Paid && _emailService.IsConfigured())
                    {
                        try
                        {
                            var partyEmail = invoice.Customer?.Email;
                            if (!string.IsNullOrWhiteSpace(partyEmail))
                            {
                                var (subj, msg) = EmailMessageFactory.InvoicePaid(invoice.Store, invoice);
                                await _emailService.SendTemplatedEmailAsync(partyEmail, subj, msg);
                            }
                        }
                        catch { }
                    }
                }
            }

            if (payment.OrderId.HasValue)
            {
                var order = await _context.Orders
                    .Include(o => o.Items)
                    .Include(o => o.Store)
                    .FirstOrDefaultAsync(o => o.Id == payment.OrderId.Value);
                if (order != null)
                {
                    order.PaymentStatus = payment.Status;
                    var wasPendingPayment = order.Status == OrderStatus.PendingPayment;

                    if (payment.Status == PaymentStatus.Paid)
                    {
                        if (order.Status == OrderStatus.PendingPayment)
                        {
                            await _orderStockService.DeductStockAsync(order);
                            await AddOrderStatusHistoryAsync(order, OrderStatus.Processing, null);
                            order.Status = OrderStatus.Processing;
                        }
                        else if (order.Status == OrderStatus.New)
                        {
                            await AddOrderStatusHistoryAsync(order, OrderStatus.Processing, null);
                            order.Status = OrderStatus.Processing;
                        }

                        if (order.PaymentMethodType != PaymentMethodType.CashOnDelivery)
                        {
                            await _accountingService.CreateSalesInvoiceForOrderAsync(order.StoreId, order.Id);
                        }

                        if (wasPendingPayment && order.Store != null && order.Store.OwnerUserId != 0)
                        {
                            try
                            {
                                await _notificationService.CreateAsync(
                                    order.Store.OwnerUserId,
                                    "تم تأكيد الدفع",
                                    $"تم تأكيد دفع الطلب رقم {order.OrderNumber} بقيمة {order.TotalAmount} ر.س — الطلب أصبح قيد المعالجة",
                                    NotificationType.OrderCreated,
                                    $"/dashboard/orders/{order.Id}");
                            }
                            catch { }
                        }
                    }
                    else if (payment.Status == PaymentStatus.Failed
                             && order.Status == OrderStatus.PendingPayment)
                    {
                        await AddOrderStatusHistoryAsync(order, OrderStatus.Cancelled, null);
                        order.Status = OrderStatus.Cancelled;

                        if (order.Store != null && order.Store.OwnerUserId != 0)
                        {
                            try
                            {
                                await _notificationService.CreateAsync(
                                    order.Store.OwnerUserId,
                                    "فشل دفع الطلب",
                                    $"لم يُكمل العميل دفع الطلب رقم {order.OrderNumber} — تم إلغاء الطلب تلقائيًا",
                                    NotificationType.OrderCreated,
                                    $"/dashboard/orders/{order.Id}");
                            }
                            catch { }
                        }
                    }
                }
            }

            if (payment.SubscriptionId.HasValue)
            {
                var subscription = await _context.Subscriptions.FindAsync(payment.SubscriptionId.Value);
                if (subscription != null)
                {
                    subscription.PaymentStatus = payment.Status.ToString();
                    subscription.UpdatedAt = DateTime.UtcNow;

                    if (payment.Status == PaymentStatus.Paid)
                    {
                        await _subscriptionService.ActivateSubscriptionOnPaymentAsync(subscription.Id);
                        await AwardReferralCommissionAsync(subscription, payment);
                    }
                }
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    private async Task AddOrderStatusHistoryAsync(Order order, OrderStatus newStatus, long? changedByUserId)
    {
        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = newStatus,
            ChangedByUserId = changedByUserId,
            ChangedAt = DateTime.UtcNow
        });
    }

    private async Task AwardReferralCommissionAsync(Subscription subscription, Payment payment)
    {
        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == subscription.StoreId);
        if (store == null)
            return;

        var package = store.Package;
        if (package == null || !package.HasAffiliateMarketing || package.CommissionPercentage <= 0)
            return;

        var referral = await _context.Referrals
            .FirstOrDefaultAsync(r => r.ReferredUserId == store.OwnerUserId && !r.HasConverted);
        if (referral == null)
            return;

        referral.HasConverted = true;
        referral.ConvertedAt = DateTime.UtcNow;
        referral.UpdatedAt = DateTime.UtcNow;

        var commissionAmount = payment.Amount * (package.CommissionPercentage / 100m);

        _context.AffiliateCommissions.Add(new AffiliateCommission
        {
            ReferralId = referral.Id,
            StoreId = store.Id,
            SubscriptionId = subscription.Id,
            Amount = commissionAmount,
            Currency = payment.Currency,
            Rate = package.CommissionPercentage,
            Status = AffiliateCommissionStatus.Pending,
            CreatedAt = DateTime.UtcNow,
        });
    }

    public async Task<PagedResult<PaymentListDto>> GetPaymentsAsync(long storeId, string? statusFilter = null, int page = 1, int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Payments
            .Where(p => p.Invoice != null && p.Invoice.StoreId == storeId
                     || p.Order != null && p.Order.StoreId == storeId
                     || p.Subscription != null && p.Subscription.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(statusFilter) && Enum.TryParse<PaymentStatus>(statusFilter, out var statusEnum))
            query = query.Where(p => p.Status == statusEnum);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
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

        return new PagedResult<PaymentListDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = items
        };
    }

    public async Task<PaymentStatusResult> RefundPaymentAsync(long storeId, string paymentReference)
    {
        var payment = await _context.Payments
            .Include(p => p.Invoice)
            .Include(p => p.Order)
            .Include(p => p.Subscription)
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

        var belongsToStore = (payment.Invoice != null && payment.Invoice.StoreId == storeId)
            || (payment.Order != null && payment.Order.StoreId == storeId)
            || (payment.Subscription != null && payment.Subscription.StoreId == storeId);
        if (!belongsToStore)
        {
            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                Status = "not_found",
                Message = "الدفعة غير موجودة"
            };
        }

        if (payment.Status != PaymentStatus.Paid)
        {
            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                Message = "لا يمكن استرداد دفعة غير مدفوعة"
            };
        }

        if (string.IsNullOrWhiteSpace(payment.ProviderPaymentId))
        {
            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                Message = "لا يوجد معرّف دفع لدى المزود لإتمام الاسترداد"
            };
        }

        RefundOutcome refundResult;
        if (payment.ProviderType == PaymentProviderType.PayPal)
        {
            var captureId = payment.ProviderCaptureId;
            if (string.IsNullOrWhiteSpace(captureId))
            {
                var orderStatus = await _payPalProvider.GetOrderStatusAsync(payment.ProviderPaymentId);
                captureId = orderStatus.ProviderCaptureId;
            }
            if (string.IsNullOrWhiteSpace(captureId))
            {
                return new PaymentStatusResult
                {
                    PaymentReference = paymentReference,
                    Status = payment.Status.ToString(),
                    Amount = payment.Amount,
                    Message = "لا يمكن الاسترداد قبل اكتمال تحصيل الدفع عبر PayPal"
                };
            }
            var payPalRefund = await _payPalProvider.RefundCaptureAsync(captureId, payment.Amount, payment.Currency);
            refundResult = new RefundOutcome
            {
                Success = payPalRefund.Success,
                ErrorMessage = payPalRefund.ErrorMessage,
                RawResponse = payPalRefund.RawResponse
            };
        }
        else if (payment.ProviderType == PaymentProviderType.Tabby)
        {
            var secrets = await _credentialService.GetSecretsAsync(storeId, PaymentProviderType.Tabby);
            if (secrets == null || string.IsNullOrWhiteSpace(secrets.SecretKey))
            {
                return new PaymentStatusResult
                {
                    PaymentReference = paymentReference,
                    Status = payment.Status.ToString(),
                    Amount = payment.Amount,
                    Message = "بيانات تابي غير متوفرة للتاجر لإتمام الاسترداد"
                };
            }
            var tabbyRefund = await _tabbyProvider.RefundPaymentAsync(secrets.SecretKey, payment.ProviderPaymentId, payment.Amount);
            refundResult = new RefundOutcome
            {
                Success = tabbyRefund.Success,
                ErrorMessage = tabbyRefund.ErrorMessage,
                RawResponse = tabbyRefund.RawResponse
            };
        }
        else if (payment.ProviderType == PaymentProviderType.Tamara)
        {
            var secrets = await _credentialService.GetSecretsAsync(storeId, PaymentProviderType.Tamara);
            if (secrets == null || string.IsNullOrWhiteSpace(secrets.SecretKey))
            {
                return new PaymentStatusResult
                {
                    PaymentReference = paymentReference,
                    Status = payment.Status.ToString(),
                    Amount = payment.Amount,
                    Message = "بيانات تمارا غير متوفرة للتاجر لإتمام الاسترداد"
                };
            }
            var tamaraRefund = await _tamaraProvider.RefundOrderAsync(secrets.SecretKey, secrets.IsTestMode, payment.ProviderPaymentId, payment.Amount, payment.Currency);
            refundResult = new RefundOutcome
            {
                Success = tamaraRefund.Success,
                ErrorMessage = tamaraRefund.ErrorMessage,
                RawResponse = tamaraRefund.RawResponse
            };
        }
        else
        {
            var moyasarRefund = await _provider.RefundPaymentAsync(payment.ProviderPaymentId);
            refundResult = new RefundOutcome
            {
                Success = moyasarRefund.Success,
                ErrorMessage = moyasarRefund.ErrorMessage,
                RawResponse = moyasarRefund.RawResponse
            };
        }

        if (!refundResult.Success)
        {
            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                Message = refundResult.ErrorMessage ?? "فشل إتمام الاسترداد"
            };
        }

        payment.Status = PaymentStatus.Refunded;
        payment.RefundedAt = DateTime.UtcNow;
        payment.GatewayResponse = refundResult.RawResponse;
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (payment.SubscriptionId.HasValue)
        {
            var subscription = await _context.Subscriptions.FindAsync(payment.SubscriptionId.Value);
            if (subscription != null)
            {
                subscription.PaymentStatus = "Refunded";
                subscription.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (payment.OrderId.HasValue)
        {
            var order = await _context.Orders.FindAsync(payment.OrderId.Value);
            if (order != null)
            {
                order.PaymentStatus = PaymentStatus.Refunded;
                order.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (payment.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(payment.InvoiceId.Value);
            if (invoice != null)
            {
                invoice.PaymentStatus = PaymentStatus.Refunded;
                invoice.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (payment.OrderId.HasValue)
        {
            await _accountingService.ReverseOrderSalesInvoiceAsync(storeId, payment.OrderId.Value);
        }

        await _context.SaveChangesAsync();

        return new PaymentStatusResult
        {
            PaymentReference = paymentReference,
            ProviderPaymentId = payment.ProviderPaymentId,
            Status = PaymentStatus.Refunded.ToString(),
            Amount = payment.Amount,
            RefundedAt = payment.RefundedAt?.ToString("o"),
            Message = "تم إتمام الاسترداد بنجاح"
        };
    }

    public async Task<BankTransferResult> UploadBankTransferReceiptAsync(string slug, string orderNumber, string? phone, long? customerId, string receiptUrl, string? reference)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);
        if (store == null)
            return new BankTransferResult { Success = false, Message = "المتجر غير موجود" };

        var order = await _context.Orders
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.StoreId == store.Id && o.OrderNumber == orderNumber);
        if (order == null)
            return new BankTransferResult { Success = false, Message = "الطلب غير موجود" };

        var authorized = false;
        if (customerId.HasValue && order.CustomerId == customerId.Value)
        {
            authorized = true;
        }
        else if (!string.IsNullOrWhiteSpace(phone))
        {
            var expectedPhone = order.CustomerId != null ? order.Customer!.Phone : order.GuestPhone;
            authorized = expectedPhone == phone;
        }
        if (!authorized)
            return new BankTransferResult { Success = false, Message = "بيانات التحقق غير صحيحة" };

        if (order.PaymentMethodType != PaymentMethodType.BankTransfer)
            return new BankTransferResult { Success = false, Message = "هذا الطلب لا يستخدم الحوالة البنكية" };

        if (order.PaymentStatus == PaymentStatus.Paid)
            return new BankTransferResult { Success = false, Message = "تم تأكيد دفع هذا الطلب بالفعل" };

        if (string.IsNullOrWhiteSpace(receiptUrl))
            return new BankTransferResult { Success = false, Message = "رابط الإيصال مطلوب" };

        var payment = await _context.Payments
            .Where(p => p.OrderId == order.Id && p.ProviderType == PaymentProviderType.BankTransfer)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (payment == null)
        {
            payment = new Payment
            {
                PaymentReference = Guid.NewGuid().ToString("N").Substring(0, 16),
                OrderId = order.Id,
                Amount = order.TotalAmount,
                Currency = store.Currency,
                Status = PaymentStatus.Pending,
                ProviderType = PaymentProviderType.BankTransfer,
                CreatedAt = DateTime.UtcNow
            };
            _context.Payments.Add(payment);
        }

        payment.BankReceiptUrl = receiptUrl;
        payment.BankTransferReference = reference?.Trim();
        payment.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return new BankTransferResult
        {
            Success = true,
            ReceiptUrl = receiptUrl,
            Reference = reference,
            Message = "تم إرسال الإيصال بنجاح — سيتأكد المتجر من التحويل ويؤكد طلبك"
        };
    }

    public async Task<PaymentStatusResult> ConfirmBankTransferAsync(long storeId, long orderId)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);
        if (order == null)
        {
            return new PaymentStatusResult { Status = "not_found", Message = "الطلب غير موجود" };
        }

        if (order.PaymentMethodType != PaymentMethodType.BankTransfer)
        {
            return new PaymentStatusResult
            {
                PaymentReference = order.OrderNumber,
                Status = order.PaymentStatus.ToString(),
                Message = "هذا الطلب لا يستخدم الحوالة البنكية"
            };
        }

        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            return new PaymentStatusResult
            {
                PaymentReference = order.OrderNumber,
                Status = PaymentStatus.Paid.ToString(),
                Message = "تم تأكيد دفع هذا الطلب مسبقًا"
            };
        }

        var payment = await _context.Payments
            .Where(p => p.OrderId == order.Id && p.ProviderType == PaymentProviderType.BankTransfer)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        if (payment == null)
        {
            return new PaymentStatusResult
            {
                PaymentReference = order.OrderNumber,
                Status = order.PaymentStatus.ToString(),
                Message = "لا يوجد سجل دفع حوالة لهذا الطلب"
            };
        }

        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = DateTime.UtcNow;
        payment.UpdatedAt = DateTime.UtcNow;

        await ApplyPaymentSideEffectsAsync(payment);

        return new PaymentStatusResult
        {
            PaymentReference = payment.PaymentReference,
            Status = PaymentStatus.Paid.ToString(),
            Amount = payment.Amount,
            PaidAt = payment.PaidAt?.ToString("o"),
            Message = "تم تأكيد الحوالة البنكية واعتماد الطلب كمدفوع"
        };
    }

    public async Task<PaymentStatusResult> ConfirmPosBankTransferAsync(long storeId, string paymentReference)
    {
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.PaymentReference == paymentReference
                                   && p.PosShiftStoreId == storeId
                                   && p.ProviderType == PaymentProviderType.BankTransfer);

        if (payment == null)
        {
            return new PaymentStatusResult { PaymentReference = paymentReference, Status = "not_found", Message = "لم يتم العثور على عملية التحويل" };
        }

        if (payment.Status == PaymentStatus.Paid)
        {
            return new PaymentStatusResult { PaymentReference = paymentReference, Status = PaymentStatus.Paid.ToString(), Message = "تم تأكيد هذه العملية مسبقًا" };
        }

        if (string.IsNullOrWhiteSpace(payment.PendingPosPayloadJson))
        {
            return new PaymentStatusResult { PaymentReference = paymentReference, Status = payment.Status.ToString(), Message = "لا توجد بيانات بيع معلقة لهذه العملية" };
        }

        payment.Status = PaymentStatus.Paid;
        payment.PaidAt = DateTime.UtcNow;
        payment.UpdatedAt = DateTime.UtcNow;

        await ApplyPaymentSideEffectsAsync(payment);

        return new PaymentStatusResult
        {
            PaymentReference = payment.PaymentReference,
            Status = PaymentStatus.Paid.ToString(),
            Amount = payment.Amount,
            PaidAt = payment.PaidAt?.ToString("o"),
            Message = "تم تأكيد استلام التحويل وتسجيل عملية البيع"
        };
    }

    public async Task<PaymentStatusResult> HandlePayPalWebhookAsync(PayPalWebhookPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.OrderId) && string.IsNullOrWhiteSpace(payload.CaptureId))
            return new PaymentStatusResult { Status = "not_found", Message = "بيانات غير كافية" };

        Payment? payment = null;
        if (!string.IsNullOrWhiteSpace(payload.OrderId))
        {
            payment = await _context.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.ProviderPaymentId == payload.OrderId);
        }

        if (payment == null && !string.IsNullOrWhiteSpace(payload.CaptureId))
        {
            payment = await _context.Payments
                .Include(p => p.Order)
                .FirstOrDefaultAsync(p => p.ProviderCaptureId == payload.CaptureId);
        }

        if (payment == null)
            return new PaymentStatusResult { Status = "not_found", Message = "الدفعة غير موجودة" };

        if (payment.ProviderType != PaymentProviderType.PayPal)
            return new PaymentStatusResult { Status = payment.Status.ToString(), Message = "دفعة غير تابعة لـ PayPal" };

        if (string.Equals(payload.EventType, "PAYMENT.CAPTURE.COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Paid;
            payment.ProviderCaptureId = payload.CaptureId ?? payment.ProviderCaptureId;
            payment.PaidAt = DateTime.UtcNow;
            payment.GatewayResponse = payload.EventType;

            await ApplyPaymentSideEffectsAsync(payment);
            return new PaymentStatusResult
            {
                PaymentReference = payment.PaymentReference,
                Status = PaymentStatus.Paid.ToString(),
                Amount = payment.Amount,
                PaidAt = payment.PaidAt?.ToString("o"),
                Message = "تم تأكيد التحصيل عبر PayPal"
            };
        }

        if (string.Equals(payload.EventType, "PAYMENT.CAPTURE.DENIED", StringComparison.OrdinalIgnoreCase)
            || string.Equals(payload.EventType, "PAYMENT.CAPTURE.REVERSED", StringComparison.OrdinalIgnoreCase))
        {
            if (AllowStatusTransition(payment.Status, PaymentStatus.Failed))
            {
                payment.Status = PaymentStatus.Failed;
                payment.FailedAt = DateTime.UtcNow;
            }
            payment.GatewayResponse = payload.EventType;
            await ApplyPaymentSideEffectsAsync(payment);
            return new PaymentStatusResult
            {
                PaymentReference = payment.PaymentReference,
                Status = PaymentStatus.Failed.ToString(),
                Amount = payment.Amount,
                Message = "تم تسجيل رفض/إلغاء الدفع عبر PayPal وإلغاء الطلب المعلّق"
            };
        }

        if (string.Equals(payload.EventType, "PAYMENT.CAPTURE.REFUNDED", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Refunded;
            payment.RefundedAt = DateTime.UtcNow;
            payment.GatewayResponse = payload.EventType;
            await _context.SaveChangesAsync();
            return new PaymentStatusResult
            {
                PaymentReference = payment.PaymentReference,
                Status = PaymentStatus.Refunded.ToString(),
                Message = "تم تسجيل حالة الاسترداد عبر PayPal"
            };
        }

        return new PaymentStatusResult
        {
            PaymentReference = payment.PaymentReference,
            Status = payment.Status.ToString(),
            Message = "تم استلام الحدث دون تغيير"
        };
    }

    private static bool AreAmountsEqual(decimal a, decimal b) => Math.Abs(a - b) < 0.01m;

    private static bool AllowStatusTransition(PaymentStatus current, PaymentStatus incoming)
    {
        return current switch
        {
            PaymentStatus.Paid => incoming == PaymentStatus.Paid || incoming == PaymentStatus.Refunded,
            PaymentStatus.Refunded => incoming == PaymentStatus.Refunded,
            _ => true
        };
    }

    private static string BuildPaymentDescription(CreatePaymentDto dto)
    {
        if (dto.SubscriptionId.HasValue)
            return "دفع اشتراك - فاتورة راحتك";
        if (dto.OrderId.HasValue)
            return "سداد طلب إلكتروني - فاتورة راحتك";
        if (dto.InvoiceId.HasValue)
            return "سداد فاتورة محاسبية - فاتورة راحتك";
        return "دفع - فاتورة راحتك";
    }

    private static PaymentStatus MapStatus(string? providerStatus)
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

    private async Task<BankTransferInfoDto?> GetPlatformBankAccountAsync()
    {
        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "platform_bank_account");
        if (setting != null && !string.IsNullOrWhiteSpace(setting.SettingValue))
        {
            try
            {
                using var doc = JsonDocument.Parse(setting.SettingValue);
                var root = doc.RootElement;
                var iban = root.TryGetProperty("iban", out var ib) ? ib.GetString() : null;
                var bankName = root.TryGetProperty("bankName", out var bn) ? bn.GetString() : null;
                var holder = root.TryGetProperty("accountHolder", out var ah) ? ah.GetString() : null;

                if (!string.IsNullOrWhiteSpace(iban) && !iban.Contains('?')
                    && !(bankName ?? "").Contains('?') && !(holder ?? "").Contains('?'))
                {
                    return new BankTransferInfoDto
                    {
                        BankName = bankName,
                        AccountHolder = holder,
                        Iban = iban
                    };
                }
            }
            catch
            {
            }
        }

        var cfgBank = _config["App:PlatformBank:BankName"];
        var cfgHolder = _config["App:PlatformBank:AccountHolder"];
        var cfgIban = _config["App:PlatformBank:Iban"];
        if (!string.IsNullOrWhiteSpace(cfgIban))
        {
            return new BankTransferInfoDto
            {
                BankName = cfgBank,
                AccountHolder = cfgHolder,
                Iban = cfgIban
            };
        }

        return new BankTransferInfoDto
        {
            BankName = "البنك الأهلي السعودي",
            AccountHolder = "فاتورة راحتك",
            Iban = "SA0000000000000000000000"
        };
    }
}
