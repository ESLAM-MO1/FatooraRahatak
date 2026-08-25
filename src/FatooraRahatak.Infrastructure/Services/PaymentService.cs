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
    private readonly ISubscriptionService _subscriptionService;
    private readonly IAccountingService _accountingService;
    private readonly IOrderStockService _orderStockService;
    private readonly INotificationService _notificationService;
    private readonly IConfiguration _config;
    private readonly ILogger<PaymentService> _logger;

    public PaymentService(AppDbContext context, MoyasarPaymentProvider provider, PayPalPaymentProvider payPalProvider, TabbyPaymentProvider tabbyProvider, TamaraPaymentProvider tamaraProvider, ISubscriptionService subscriptionService, IAccountingService accountingService, IOrderStockService orderStockService, INotificationService notificationService, IConfiguration config, ILogger<PaymentService> logger)
    {
        _context = context;
        _provider = provider;
        _payPalProvider = payPalProvider;
        _tabbyProvider = tabbyProvider;
        _tamaraProvider = tamaraProvider;
        _subscriptionService = subscriptionService;
        _accountingService = accountingService;
        _orderStockService = orderStockService;
        _notificationService = notificationService;
        _config = config;
        _logger = logger;
    }

    public async Task<CreatePaymentResult> CreatePaymentLinkAsync(CreatePaymentDto dto, long? storeId = null)
    {
        if (dto.Amount <= 0)
            return new CreatePaymentResult { Success = false, Message = "مبلغ الدفع غير صالح" };

        // نقطة البيع (POS): الدفع الإلكتروني يُنشأ بدون مرجع (طلب/فاتورة/اشتراك) —
        // بيانات البيع المعلقة مخزنة في PendingPosPayloadJson وتُنفَّذ عند تأكيد الدفع.
        if (!dto.SubscriptionId.HasValue && !dto.OrderId.HasValue && !dto.InvoiceId.HasValue
            && string.IsNullOrWhiteSpace(dto.PendingPosPayloadJson))
            return new CreatePaymentResult { Success = false, Message = "يجب تحديد مرجع الدفع (طلب أو فاتورة أو اشتراك)" };

        // التحقق من أن الاشتراك المرفق حقيقي وله مبلغ مستحق فعليًا
        if (dto.SubscriptionId.HasValue)
        {
            var subscription = await _context.Subscriptions.FindAsync(dto.SubscriptionId.Value);
            if (subscription == null)
                return new CreatePaymentResult { Success = false, Message = "الاشتراك غير موجود" };
            // ⚠️ إغلاق ثغرة IDOR: لا يجوز إنشاء رابط دفع لاشتراك لا يخص متجر المستخدم
            if (storeId.HasValue && subscription.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الاشتراك غير موجود" };
            if (subscription.PaymentStatus == "Paid")
                return new CreatePaymentResult { Success = false, Message = "هذا الاشتراك مدفوع بالفعل" };
            if (subscription.Status != SubscriptionStatus.Pending)
                return new CreatePaymentResult { Success = false, Message = "لا يمكن دفع اشتراك غير معلّق" };
            // ⚠️ إغلاق ثغرة "دفع مبلغ ناقص": لا يُقبل إلا المبلغ المستحق الفعلي المحسوب مسبقًا
            if (!AreAmountsEqual(dto.Amount, subscription.DueAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {subscription.DueAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        // ❗️ دفع الطلب: المبلغ يصل مباشرة لحساب المنصة لدى موياسر (بدون splits).
        // التحصيل الإلكتروني من العملاء يتم على حساب المنصة مباشرة.
        if (dto.OrderId.HasValue)
        {
            var order = await _context.Orders
                .Include(o => o.Store)
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId.Value);
            if (order == null)
                return new CreatePaymentResult { Success = false, Message = "الطلب غير موجود" };
            // ⚠️ إغلاق ثغرة IDOR: لا يجوز إنشاء رابط دفع لطلب لا يخص متجر المستخدم
            if (storeId.HasValue && order.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الطلب غير موجود" };

            // ⚠️ إغلاق ثغرة "دفع مبلغ ناقص": المبلغ يجب أن يطابق إجمالي الطلب الفعلي
            if (!AreAmountsEqual(dto.Amount, order.TotalAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {order.TotalAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        // فاتورة محاسبية: المبلغ يجب أن يطابق إجمالي الفاتورة
        if (dto.InvoiceId.HasValue)
        {
            var invoice = await _context.Invoices.FindAsync(dto.InvoiceId.Value);
            if (invoice == null)
                return new CreatePaymentResult { Success = false, Message = "الفاتورة غير موجودة" };
            // ⚠️ إغلاق ثغرة IDOR: لا يجوز إنشاء رابط دفع لفاتورة لا تخص متجر المستخدم
            if (storeId.HasValue && invoice.StoreId != storeId.Value)
                return new CreatePaymentResult { Success = false, Message = "الفاتورة غير موجودة" };
            if (!AreAmountsEqual(dto.Amount, invoice.TotalAmount))
                return new CreatePaymentResult
                {
                    Success = false,
                    Message = $"المبلغ المطلوب دفعه هو {invoice.TotalAmount:0.##} ر.س وليس ما أرسلته"
                };
        }

        // ✅ يحدد مزوّد الدفع حسب طريقة الدفع الخاصة بالطلب نفسه:
        //   - CreditCard / Mada → ميسرة (بوابة دفع محلية تدعم البطاقات والشبكة)
        //   - PayPal → PayPal REST API
        //   - BankTransfer → حوالة بنكية يدوية (بيانات حساب + تأكيد التاجر)
        //   - Tabby → بوابة تابي (قسّطها / اشترِ الآن وادفع لاحقًا)
        //   - Tamara → بوابة تمارا (قسّطها)
        // إذا لم يكن طلبًا (اشتراك/فاتورة) يبقى المزوّد ميسرة كسلوك افتراضي.
        PaymentProviderType providerType = PaymentProviderType.Moyasar;
        PayPalPaymentResult? payPalResult = null;
        MoyasarPaymentResult? moyasarResult = null;
        TabbyPaymentResult? tabbyResult = null;
        TamaraPaymentResult? tamaraResult = null;
        BankTransferInfoDto? bankTransferInfo = null;

        // ⚠️ إصلاح: ميسرا يرفض إنشاء الفاتورة بوصف فارغ (validation_error). نولّد وصفًا افتراضيًا
        // حسب نوع الدفعة عندما لا يُرسل العميل وصفًا — حتى تُفتح بوابة الدفع فعلًا دائمًا.
        var description = string.IsNullOrWhiteSpace(dto.Description)
            ? BuildPaymentDescription(dto)
            : dto.Description;

        // 🔔 إصلاح الباقة لا تُطبَّق بعد الدفع الناجح: كان رابط الدفع (الاشتراك/الفاتورة المحمية)
        // يُرسل callback_url يساوي ما يبعثه العميل (صفحة اللوحة) كـ webhook إلى موياسر، فكان
        // إشعار اكتمال الدفع يذهب إلى صفحة الواجهة بدل السيرفر → لا يُفعَّل الاشتراك ولا يصل
        // إشعار "تم تفعيل الباقة". الآن نبني دائمًا رابط webhook الخادم من App:BaseUrl تمامًا
        // كما تفعل خدمة الطلبات (OrderService) — والعميل لن يستطيع تجاوزه.
        var paymentCallbackUrl = (_config["App:BaseUrl"] ?? "https://your-domain.com")
            .TrimEnd('/') + "/api/v1/payments/webhook";

        Console.Error.WriteLine($"[PAYMENT] CreatePaymentLinkAsync. Order={dto.OrderId} Inv={dto.InvoiceId} Sub={dto.SubscriptionId} Amount={dto.Amount} Currency={dto.Currency} Desc='{description}' Callback={paymentCallbackUrl}");

        if (dto.OrderId.HasValue)
        {
            var orderForMethod = await _context.Orders
                .Include(o => o.Store)
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId.Value);
            if (orderForMethod?.PaymentMethodType == PaymentMethodType.PayPal)
            {
                providerType = PaymentProviderType.PayPal;
            }
            else if (orderForMethod?.PaymentMethodType == PaymentMethodType.Tabby)
            {
                providerType = PaymentProviderType.Tabby;
            }
            else if (orderForMethod?.PaymentMethodType == PaymentMethodType.Tamara)
            {
                providerType = PaymentProviderType.Tamara;
            }
        }

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
            tabbyResult = await _tabbyProvider.CreateCheckoutSessionAsync(
                dto.Amount,
                dto.Currency,
                description,
                dto.SuccessUrl,
                dto.CallbackUrl,
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
            tamaraResult = await _tamaraProvider.CreateCheckoutSessionAsync(
                dto.Amount,
                dto.Currency,
                description,
                dto.SuccessUrl,
                dto.CallbackUrl,
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
            var orderForBank = await _context.Orders
                .Include(o => o.Store)
                .FirstOrDefaultAsync(o => o.Id == dto.OrderId.Value);
            var storeForBank = orderForBank?.Store;
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
        else
        {
            // 💳 إذا أُرسلت بيانات البطاقة من فورم الدفع المدمج → دفع مباشر لدى ميسرا
            // (source: creditcard) يُرجع صفحة 3DS يكمّل فيها المستخدم تأكيد الدفع.
            // ❗️ لا تُستخدم إلا في بيئة الاختبار/sandbox — في الإنتاج يُفضَّل الـ Hosted Checkout
            // أدناه حتى لا تمر بيانات البطاقة عبر خادمنا (توافق PCI).
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
                // 🧾 الدفع المحمي (Hosted Checkout): تُنشأ فاتورة لدى موياسر تضم صفحة دفع
                // يكمل العميل فيها بيانات بطاقته على موقع ميسرا — بدون بيانات كارت في نظامنا.
                // ⚠️ إصلاح: مويصر يرفض (validation_error) أي success_url/back_url نسبي (مثل
                // "/store/amr/thank-you/...") — يجب أن تكون URLs كاملة بالدومين. نضمن الدومين
                // من App:StoreFrontBaseUrl (أو App:BaseUrl) لو القيمة المرسلة مسار نسبي.
                var storeFrontBase = _config["App:StoreFrontBaseUrl"];
                if (string.IsNullOrWhiteSpace(storeFrontBase)) storeFrontBase = _config["App:BaseUrl"];
                if (string.IsNullOrWhiteSpace(storeFrontBase)) storeFrontBase = "http://localhost:3000";
                storeFrontBase = storeFrontBase.TrimEnd('/');
                string fullSuccessUrl = dto.SuccessUrl ?? "";
                if (!string.IsNullOrWhiteSpace(fullSuccessUrl))
                {
                    if (fullSuccessUrl.StartsWith('/'))
                        fullSuccessUrl = storeFrontBase + fullSuccessUrl;
                    else if (!fullSuccessUrl.Contains("://"))
                        fullSuccessUrl = storeFrontBase + "/" + fullSuccessUrl;
                }

                Console.Error.WriteLine($"[PAYMENT] fullSuccessUrl='{fullSuccessUrl}' (storeFrontBase='{storeFrontBase}')");

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

        // ⚠️ إصلاح ثغرة "الدفع المكرر": لا يُنشأ إلا سجل دفع واحد لكل مرجع (اشتراك/طلب/فاتورة) —
        // الفهرس الفريد IX_Payments_SubscriptionId إلخ يمنع سجلًا ثانيًا. عند إعادة محاولة الدفع
        // لنفس الاشتراك (بعد فشل/انتهاء محاولة سابقة أو التحويل بين البطاقة والـ Hosted Checkout)
        // نعيد استخدام نفس السجل ونحدّث بيانات مزوّد الدفع الجديدة بدل 500.
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
            existingPayment.PosShiftStoreId = dto.PosShiftStoreId;
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
                // ⚠️ إصلاح (باق الخلل الأساسي في تاسك الإلغاء): كان يتم تسجيل ProviderPaymentId
                // فقط لـ PayPal، وتُترك null دائمًا لمدفوعات ميسرة (Moyasar/CreditCard).
                // النتيجة: CancelOrderAsync و RefundPaymentAsync كانا يفشلان في إيجاد الدفعة
                // القابلة للاسترداد لأي طلب مدفوع بالبطاقة، فيتحول الطلب لحالة PendingRefund
                // ويتوقف قبل الوصول لخطوات إرجاع المخزون وعكس القيد المحاسبي وتحديث الحالة.
                // الآن يُسجَّل معرّف موياسر (رقم الفاتورة لديها) بنفس منطق GatewayResponse تمامًا.
                ProviderPaymentId = providerPaymentId,
                CallbackUrl = dto.CallbackUrl,
                GatewayResponse = gatewayResponse,
                PendingPosPayloadJson = dto.PendingPosPayloadJson,
                PosShiftStoreId = dto.PosShiftStoreId,
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

        // ⚠️ إغلاق ثغرة IDOR: لا يجوز الاستعلام عن حالة دفعة لا تخص متجر المستخدم
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
            bool success;
            string status;
            string? rawResponse;
            string? errorMessage;

            if (payment.ProviderType == PaymentProviderType.PayPal)
            {
                var payPalResult = await _payPalProvider.GetOrderStatusAsync(payment.ProviderPaymentId);
                success = payPalResult.Success;
                status = payPalResult.Status;
                rawResponse = payPalResult.RawResponse;
                errorMessage = payPalResult.ErrorMessage;
            }
            else
            {
                var moyasarResult = await _provider.GetPaymentStatusAsync(payment.ProviderPaymentId);
                success = moyasarResult.Success;
                status = moyasarResult.Status;
                rawResponse = moyasarResult.RawResponse;
                errorMessage = moyasarResult.ErrorMessage;
            }

            if (success)
            {
                // ⚠️ إصلاح "الدفع نجح ثم عاد للفشل": بمجرد تأكيد الدفعة مدفوعة (Paid) لا نسمح
                // لأي فحص/ويب هوك لاحق بإرجاعها إلى Failed/Pending (مثل انتهاء جلسة 3DS في
                // بيئة الاختبار بعد اكتمال الدفع) — وإلا تتلف حالة الاشتراك/الطلب المرتبط.
                var mappedStatus = MapStatus(status);
                if (AllowStatusTransition(payment.Status, mappedStatus))
                {
                    payment.Status = mappedStatus;
                    if (mappedStatus == PaymentStatus.Paid && payment.PaidAt == null)
                        payment.PaidAt = DateTime.UtcNow;
                    if (mappedStatus == PaymentStatus.Failed)
                        payment.FailedAt = DateTime.UtcNow;
                }
                payment.GatewayResponse = rawResponse;

                // ⚠️ لا نحفظ payment.Status هنا مبكرًا: آثار الدفع (خصم المخزون/تأكيد الطلب/
                // تفعيل الاشتراك) تُطبَّق داخل معاملة واحدة مع حالة الدفع في
                // ApplyPaymentSideEffectsAsync — لو فشل خصم المخزون مثلًا لا يبقى سجل
                // "مدفوع" بدون تأكيد الطلب فعليًا.
                // ⚠️ على localhost لا يصلك webhook من مواسر، لذا نطبق نفس أثر الدفع
                // (تفعيل الاشتراك/الطلب/الفاتورة) هنا عند فحص الحالة.
                await ApplyPaymentSideEffectsAsync(payment);
            }

            return new PaymentStatusResult
            {
                PaymentReference = paymentReference,
                ProviderPaymentId = payment.ProviderPaymentId,
                Status = payment.Status.ToString(),
                Amount = payment.Amount,
                PaidAt = payment.PaidAt?.ToString("o"),
                Message = success ? "تم جلب حالة الدفع" : errorMessage ?? "خطأ"
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

        var result = new FatooraRahatak.Infrastructure.Services.PayPalPaymentResult();

        if (payment.ProviderType == PaymentProviderType.PayPal)
        {
            var payPalStatusResult = await _payPalProvider.GetOrderStatusAsync(payment.ProviderPaymentId!);
            result.Success = payPalStatusResult.Success;
            result.Status = payPalStatusResult.Status;
            result.RawResponse = payPalStatusResult.RawResponse;
            result.ErrorMessage = payPalStatusResult.ErrorMessage;
            result.ProviderCaptureId = payPalStatusResult.ProviderCaptureId;
        }
        else
        {
            var moyasarStatusResult = await _provider.GetPaymentStatusAsync(payment.ProviderPaymentId!);
            result.Success = moyasarStatusResult.Success;
            result.Status = moyasarStatusResult.Status;
            result.RawResponse = moyasarStatusResult.RawResponse;
            result.ErrorMessage = moyasarStatusResult.ErrorMessage;
        }

        // ⚠️ PayPal: بعد موافقة العميل يكون الأمر APPROVED — يجب Capture للتحصيل الفعلي
        if (result.Success
            && payment.ProviderType == PaymentProviderType.PayPal
            && string.Equals(result.Status, "Pending", StringComparison.OrdinalIgnoreCase)
            && !string.IsNullOrWhiteSpace(result.ProviderCaptureId))
        {
            var captured = await _payPalProvider.CaptureOrderAsync(payment.ProviderPaymentId!);
            if (captured.Success)
            {
                payment.ProviderCaptureId = captured.ProviderCaptureId;
                result = captured;
            }
        }

        if (result.Success)
        {
            // ⚠️ إصلاح "الدفع نجح ثم عاد للفشل": لا يُسمح للفحص اللاحق بإرجاع دفعة مدفوعة
            // إلى Failed/Pending — حالة Paid قفل أحادي الاتجاه (لا تتراجع إلا بالاسترداد).
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

            // ⚠️ لا نُعدّل حالة الطلب ولا نحفظ هنا مباشرة: كل آثار الدفع (خصم المخزون/
            // تأكيد الطلب/الترحيل المحاسبي/الإلغاء عند الفشل) تُنفَّذ داخل معاملة واحدة
            // في ApplyPaymentSideEffectsAsync مع حفظ حالة الدفع معًا — حتى لا يبقى الطلب
            // "مدفوع" دون خصم مخزون عند أي فشل في التنفيذ.
            await ApplyPaymentSideEffectsAsync(payment);
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

    public async Task HandleWebhookAsync(WebhookPayload payload)
    {
        // 🔍 مطابقة الدفعة بمعرّف الدفع (webhook كائن الفاتورة أو كائن الدفع مباشرة)
        // أو بمعرّف الفاتورة (data.invoice_id في غلاف حدث الدفع) — لأننا نخزّن معرّف
        // الفاتورة في ProviderPaymentId عند إنشاء رابط الدفع المحمي (Hosted Invoice).
        var payment = await _context.Payments
            .FirstOrDefaultAsync(p => p.ProviderPaymentId == payload.PaymentId
                                   || (payload.InvoiceId != null && p.ProviderPaymentId == payload.InvoiceId));

        if (payment == null)
            return;

        // ⚠️ إغلاق ثغرة "دفع مبلغ ناقص": حتى لو اعترض المهاجم توقيع الويب هوك نفسه،
        // لا نعتبر الدفعة مكتملة إلا إذا تطابق المبلغ المدفوع فعليًا مع المبلغ المخزّن للدفعة.
        var mappedStatus = MapStatus(payload.Status);
        if (mappedStatus == PaymentStatus.Paid && !AreAmountsEqual(payload.Amount, payment.Amount))
        {
            payment.GatewayResponse = $"عدم تطابق المبلغ: المطلوب {payment.Amount:0.##} والمستلم {payload.Amount:0.##} — لم تُعتبر الدفعة مكتملة";
            await _context.SaveChangesAsync();
            return;
        }

        payment.GatewayResponse = payload.Status;

        // ⚠️ إصلاح "الدفع نجح ثم عاد للفشل": الويب هوك اللاحق لا يُرجع دفعة مدفوعة
        // إلى Failed — الـ Paid قفل أحادي الاتجاه (لا يتراجع إلا بالاسترداد).
        if (AllowStatusTransition(payment.Status, mappedStatus))
        {
            payment.Status = mappedStatus;

            if (payment.Status == PaymentStatus.Paid)
                payment.PaidAt = DateTime.UtcNow;

            if (payment.Status == PaymentStatus.Failed)
                payment.FailedAt = DateTime.UtcNow;
        }

        // ⚠️ لا نحفظ payment.Status هنا مبكرًا — يَحفظه ApplyPaymentSideEffectsAsync داخل
        // معاملة واحدة مع كامل آثار الدفع (خصم المخزون/تأكيد الطلب/الترحيل المحاسبي/الإلغاء).
        await ApplyPaymentSideEffectsAsync(payment);
    }

    // ⚠️ إصلاح ثغرة "الشراء المجاني" (أولوية قصوى): كل آثار الدفع تُنفَّذ داخل معاملة واحدة
    // مع حفظ حالة الدفع معًا. الترتيب الصحيح المضمون هنا:
    //   1) الدفع المكتمل (Paid) → خصم المخزون أولًا → ثم تأكيد الطلب (Processing) → الترحيل المحاسبي.
    //      لو فشل خصم المخزون لأي سبب، تُرجع المعاملة كاملة ولا يبقى الطلب "مدفوع" بلا مخزون.
    //   2) الدفع الفاشل (Failed) على طلب معلّق (PendingPayment) → يُلغى الطلب بدون أي خصم مخزون.
    //   3) الطلب المتروك (لم يُدفع ولم يفشل) → يبقى PendingPayment، لا يُؤكَّد تلقائيًا أبدًا.
    // النداءات المتكررة (webhook متكرر + فحص حالة) آمنة: بعد التأكيد يصبح الطلب Processing
    // فلا يُخصم المخزون ولا يُرحَّل محاسبيًا مرة أخرى.
    private async Task ApplyPaymentSideEffectsAsync(Payment payment)
    {
        // نقطة البيع (POS): الدفع الإلكتروني أُنشئ بدون فاتورة — بيانات البيع معلقة في
        // PendingPosPayloadJson. عند تأكيد الدفع نُنشئ الفاتورة فعليًا (خصم مخزون + قيود
        // محاسبية) تمامًا كما يفعل مسار البيع النقدي المباشر.
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
                            UnitPrice = 0m, // يُؤخذ السعر من قاعدة البيانات عند التأكيد
                            DiscountAmount = i.DiscountAmount
                        }).ToList()
                    });

                    // تحديث إجماليات الوردية المفتوحة (نفس منطق الـ Controller في المسار النقدي)
                    await _context.Set<PosShift>()
                        .Where(s => s.StoreId == payment.PosShiftStoreId && s.ClosedAt == null)
                        .ExecuteUpdateAsync(setters => setters
                            .SetProperty(s => s.TotalSales, s => s.TotalSales + posSale.TotalAmount)
                            .SetProperty(s => s.TotalCardSales, s => s.TotalCardSales + posSale.TotalAmount));

                    // ✅ أنشأنا الفاتورة — نمسح الـ payload حتى لا تُعاد العملية عند تكرار الـ webhook
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
                var invoice = await _context.Invoices.FindAsync(payment.InvoiceId.Value);
                if (invoice != null)
                {
                    invoice.PaymentStatus = payment.Status;
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
                            // طلب إلكتروني لم يُخصم مخزونه عند الـ Checkout → الآن يُخصم ثم يُؤكَّد.
                            // الخصم يحدث قبل أي كتابة "مدفوع" — والفشل هنا يلغي المعاملة كاملة.
                            await _orderStockService.DeductStockAsync(order);
                            await AddOrderStatusHistoryAsync(order, OrderStatus.Processing, null);
                            order.Status = OrderStatus.Processing;
                        }
                        else if (order.Status == OrderStatus.New)
                        {
                            // طلبات أُنشئت قبل الإصلاح: خُصم مخزونها عند الـ Checkout
                            // → لا نخصم مجددًا، نؤكد فقط.
                            await AddOrderStatusHistoryAsync(order, OrderStatus.Processing, null);
                            order.Status = OrderStatus.Processing;
                        }

                        // ⚠️ الترحيل المحاسبي بعد تأكيد الدفع الإلكتروني فقط (المبيعات + COGS):
                        // الطلبات الإلكترونية تُرحَّل هنا، بينما COD يُرحَّل فورًا عند الـ Checkout.
                        if (order.PaymentMethodType != PaymentMethodType.CashOnDelivery)
                        {
                            await _accountingService.CreateSalesInvoiceForOrderAsync(order.StoreId, order.Id);
                        }

                        // ⚠️ الإشعار الأصلي عند الـ checkout كان بيقول "طلب جديد" حتى لو الدفع
                        // لسه معلّق — دلوقتي التاجر يتبلّغ فعليًا لما الدفع يتأكد بنجاح.
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
                        // ❌ الدفع رُفض/فشل/انتهت صلاحيته → يُلغى الطلب دون أي خصم مخزون
                        // (لم يكن قد خُصم أصلًا عند الـ Checkout).
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
                    // أي حالة أخرى (Pending/Refunded) → لا تغيير على حالة الطلب،
                    // يبقى معلّقًا بانتظار نتيجة البوابة (لا تأكيد تلقائي أبدًا).
                }
            }

            if (payment.SubscriptionId.HasValue)
            {
                var subscription = await _context.Subscriptions.FindAsync(payment.SubscriptionId.Value);
                if (subscription != null)
                {
                    subscription.PaymentStatus = payment.Status.ToString();
                    subscription.UpdatedAt = DateTime.UtcNow;

                    // ✅ الدفع نجح → تفعيل الاشتراك المعلّق وتطبيق باقة المتجر فورًا
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

        // الدفع بيأكد إن الإحالة "اتحولت" لعميل فعلي، بس الموافقة النهائية (وإضافة الرصيد)
        // بتفضل بايد الأدمن يدويًا من لوحة الإدارة (ReviewReferralAsync) — الحالة تفضل Pending هنا
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

        // ⚠️ إغلاق تسريب الدفع بين المتاجر: لا يجوز استرداد دفعة لا تخص متجر المستخدم
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

        // PayPal: الاسترداد يتم على capture id (العملية المُحصَّلة فعليًا)
        FatooraRahatak.Infrastructure.Services.PayPalPaymentResult refundResult;
        if (payment.ProviderType == PaymentProviderType.PayPal)
        {
            var captureId = payment.ProviderCaptureId;
            if (string.IsNullOrWhiteSpace(captureId))
            {
                // إن لم نكن حفظنا capture id، نجلب حالة الطلب لاستخراجه
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
            refundResult = await _payPalProvider.RefundCaptureAsync(captureId, payment.Amount, payment.Currency);
        }
        else
        {
            var moyasarRefund = await _provider.RefundPaymentAsync(payment.ProviderPaymentId);
            refundResult = new FatooraRahatak.Infrastructure.Services.PayPalPaymentResult
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

        // مزامنة حالة الاشتراك/الطلب المرتبط بالدفعة المستردة
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

        // ⚠️ استرداد ناجح → قيد عكسي كامل للبيع + ترحيل الفاتورة كمرتجعة
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

    // 📄 رفع إيصال الحوالة البنكية من العميل (مُتحقَّق بجلسة سريعة برقم الهاتف)
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

        // ✅ التحقق من ملكية الطلب (جلسة هاتف أو حساب عميل مسجّل) — لا قبول لرفع إيصال على طلب آخر
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

    // ✅ تأكيد التاجر لاستلام الحوالة البنكية → يُعتبر الطلب مدفوعًا وتُطبَّق آثار الدفع
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

        // ⚠️ الحفظ يتم داخل ApplyPaymentSideEffectsAsync في معاملة واحدة مع خصم المخزون
        // وتأكيد الطلب — لو فشل الخصم لا يبقى "مدفوع" بلا مخزون.
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

    // 📡 Webhook PayPal: يبحث عن الدفعة عبر order id ثم يُكمل عملية التحصيل/الاسترداد
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

        // PAYMENT.CAPTURE.COMPLETED → تأكيد التحصيل؛ DENIED → فشل الدفع؛ REFUNDED → استرداد
        if (string.Equals(payload.EventType, "PAYMENT.CAPTURE.COMPLETED", StringComparison.OrdinalIgnoreCase))
        {
            payment.Status = PaymentStatus.Paid;
            payment.ProviderCaptureId = payload.CaptureId ?? payment.ProviderCaptureId;
            payment.PaidAt = DateTime.UtcNow;
            payment.GatewayResponse = payload.EventType;

            // ⚠️ الحفظ مع كامل آثار الدفع داخل معاملة واحدة (خصم المخزون → تأكيد الطلب).
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

        // ❌ التحصيل مرفوض/ملغى من البوابة → الطلب المعلّق يُلغى بدون أي خصم مخزون
        if (string.Equals(payload.EventType, "PAYMENT.CAPTURE.DENIED", StringComparison.OrdinalIgnoreCase)
            || string.Equals(payload.EventType, "PAYMENT.CAPTURE.REVERSED", StringComparison.OrdinalIgnoreCase))
        {
            // ⚠️ قفل الحالة: لا يُرجع حدثٌ لاحق دفعةً أصبحت مدفوعة إلى فشل (الحماية من ترتيب الأحداث).
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

    /// <summary>
    /// قفل حالة الدفعة: بمجرد أن تصبح مدفوعة (Paid) لا يُسمح لأي فحص/ويب هوك لاحق بإرجاعها
    /// إلى Failed أو Pending — وإلا تتلف حالة الاشتراك/الطلب المرتبط بعد نجاح الدفع فعليًا
    /// (مثل عودة بوابة الاختبار لحالة فشل بعد انتهاء جلسة 3DS). الاسترداد فقط هو من يغيّرها.
    /// </summary>
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