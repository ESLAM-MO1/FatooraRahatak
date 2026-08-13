using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.DTOs.Orders;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Entities.Sales;
using FatooraRahatak.Domain.Entities.Shipping;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class OrderService : IOrderService
{
    private const decimal VatRate = 0.15m;

    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    private readonly ICustomerNotificationService _customerNotificationService;
    private readonly IAccountingService _accountingService;
    private readonly IPaymentService _paymentService;
    private readonly IOrderStockService _orderStockService;
    private readonly IConfiguration _config;

    public OrderService(AppDbContext context, INotificationService notificationService, ICustomerNotificationService customerNotificationService, IAccountingService accountingService, IPaymentService paymentService, IOrderStockService orderStockService, IConfiguration config)
    {
        _context = context;
        _notificationService = notificationService;
        _customerNotificationService = customerNotificationService;
        _accountingService = accountingService;
        _paymentService = paymentService;
        _orderStockService = orderStockService;
        _config = config;
    }

    public async Task<OrderConfirmationDto> CheckoutAsync(string slug, long? customerId, CheckoutRequestDto dto)
    {
        // نفس فلتر "المتجر النشط" المستخدم في PublicStoreService بالظبط
        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);

        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var package = store.Package;

        // ⚠️ إضافة تاسك 2 (معلم 6): إغلاق آخر ثغرة في فحص "المتجر معطّل" —
        // بدون هذا الشرط، كان بالإمكان إتمام الشراء فعليًا حتى لو IsOnline = false
        if (!store.IsOnline)
            throw new InvalidOperationException("المتجر غير متاح حاليًا، لا يمكن إتمام الطلب");

        if (string.IsNullOrWhiteSpace(dto.SessionId))
            throw new InvalidOperationException("جلسة السلة غير صالحة");

        if (string.IsNullOrWhiteSpace(dto.ShippingAddress))
            throw new InvalidOperationException("عنوان الشحن مطلوب");

        // طريقة الشحن المختارة: يجب أن تكون مفعّلة في إعدادات المتجر
        ShippingMethodType? shippingMethod = null;
        if (!string.IsNullOrWhiteSpace(dto.ShippingMethod))
        {
            if (!Enum.TryParse<ShippingMethodType>(dto.ShippingMethod, true, out var sm))
                throw new InvalidOperationException("طريقة الشحن غير صحيحة");
            var shippingEnabled = await _context.StoreShippingMethods
                .AnyAsync(m => m.StoreId == store.Id && m.Type == sm && m.IsEnabled);
            if (!shippingEnabled)
                throw new InvalidOperationException("طريقة الشحن المختارة غير متاحة لهذا المتجر");

            // فرض ميزة الباقة: التوصيل للعنوان يتطلب تفعيل الشحن في الباقة
            if (sm == ShippingMethodType.DeliveryToAddress && !(package?.HasShippingIntegration ?? false))
                throw new InvalidOperationException("التوصيل للعنوان غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيل الشحن.");

            shippingMethod = sm;
        }

        // ⚠️ إصلاح ثغرة "شراء مجاني" (أولوية قصوى): طريقة الدفع إلزامية تمامًا.
        // كان حذف الحقل أو تركه فارغًا يترك paymentMethod = null، فيسقط الطلب في مسار
        // "غير مؤجل" (isDeferredStockPayment = false) → يُنشأ الطلب بحالة New ويُخصم المخزون
        // فورًا دون أي بوابة دفع أو تحصيل — المنتج يُسلم مجانًا. الآن يُرفض الطلب قبل
        // أي كتابة في قاعدة البيانات (لا طلب ولا خصم مخزون) إذا لم تُحدَّد طريقة دفع صالحة.
        if (string.IsNullOrWhiteSpace(dto.PaymentMethod))
            throw new InvalidOperationException("طريقة الدفع مطلوبة");

        if (!Enum.TryParse<PaymentMethodType>(dto.PaymentMethod, true, out var pm))
            throw new InvalidOperationException("طريقة الدفع غير صحيحة");
        var paymentEnabled = await _context.StorePaymentMethods
            .AnyAsync(m => m.StoreId == store.Id && m.Type == pm && m.IsEnabled);
        if (!paymentEnabled)
            throw new InvalidOperationException("طريقة الدفع المختارة غير متاحة لهذا المتجر");

        // فرض ميزة الباقة: الدفع عند الاستلام يتطلب تفعيله في الباقة
        if (pm == PaymentMethodType.CashOnDelivery && !(package?.HasCashOnDelivery ?? false))
            throw new InvalidOperationException("الدفع عند الاستلام غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");

        var paymentMethod = pm;

        // خطوة 1: نفس آلية CartService الفعلية (StoreId + SessionId + Status == Active)
        var cart = await _context.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.StoreId == store.Id && c.SessionId == dto.SessionId && c.Status == CartStatus.Active);

        // خطوة 2: سلة فارغة أو غير موجودة
        if (cart == null || cart.Items.Count == 0)
            throw new InvalidOperationException("السلة فارغة، لا يمكن إتمام الطلب");

        // ضيف أم عميل مسجّل؟
        if (customerId == null)
        {
            if (string.IsNullOrWhiteSpace(dto.GuestName) || string.IsNullOrWhiteSpace(dto.GuestPhone))
                throw new InvalidOperationException("الاسم ورقم الهاتف مطلوبان لإتمام الطلب كزائر");
        }

        // خطوة 3: تحقق من توفر المخزون الفعلي لكل عنصر (تجميع عبر كل المستودعات المطابقة)
        var stockRowsPerItem = new Dictionary<long, List<Domain.Entities.Inventory.InventoryStock>>();

        foreach (var item in cart.Items)
        {
            var stockRows = await _context.InventoryStocks
                .Include(s => s.Warehouse)
                .Where(s => s.ProductId == item.ProductId
                            && s.VariantId == item.VariantId
                            && s.Warehouse.StoreId == store.Id)
                .ToListAsync();

            var totalAvailable = stockRows.Sum(s => s.QuantityAvailable);
            if (totalAvailable < item.Quantity)
                throw new InvalidOperationException($"الكمية المتوفرة من المنتج \"{item.Product.NameAr}\" غير كافية لإتمام الطلب");

            stockRowsPerItem[item.Id] = stockRows;
        }

        // خطوة 5 (جزء أول): SubTotal
        var subTotal = cart.Items.Sum(i => i.PriceAtAdd * i.Quantity);

        // الكوبون المطبق على السلة (لو موجود) — آخر CouponUsage مسجّلة على هذه السلة
        // إذا كانت الخصومات معطلة في إعدادات المتجر، يُتجاهل أي كوبون مطبق سابقًا
        var couponUsage = store.IsCouponsEnabled
            ? await _context.CouponUsages
                .Include(u => u.Coupon)
                .Where(u => u.CartId == cart.Id)
                .OrderByDescending(u => u.Id)
                .FirstOrDefaultAsync()
            : null;

        decimal discountAmount = 0;
        Coupon? appliedCoupon = null;

        if (couponUsage != null)
        {
            appliedCoupon = couponUsage.Coupon;

            // ⚠️ إضافة متفق عليها (خارج نص تاسك 5 الحرفي): إغلاق فجوة تاسك 2
            // التحقق من حد الاستخدام لكل عميل قبل تثبيت الكوبون على الطلب
            var otherUsagesQuery = _context.CouponUsages
                .Where(u => u.CouponId == appliedCoupon.Id && u.Id != couponUsage.Id);

            int previousUsagesByThisCustomer;
            if (customerId != null)
            {
                previousUsagesByThisCustomer = await otherUsagesQuery.CountAsync(u => u.CustomerId == customerId);
            }
            else
            {
                previousUsagesByThisCustomer = await otherUsagesQuery.CountAsync(u => u.GuestPhone == dto.GuestPhone);
            }

            if (previousUsagesByThisCustomer >= appliedCoupon.UsageLimitPerCustomer)
                throw new InvalidOperationException("لقد تجاوزت الحد المسموح لاستخدام هذا الكوبون");

            discountAmount = appliedCoupon.DiscountType == DiscountType.Percentage
                ? subTotal * (appliedCoupon.DiscountValue / 100)
                : appliedCoupon.DiscountValue;

            // ⚠️ دفاع إضافي: حتى لو وُجد كوبون بخصم سالب قديم، لا نسمح له برفع سعر الطلب
            discountAmount = Math.Min(Math.Max(discountAmount, 0m), subTotal);
        }

        var totalAmount = subTotal - discountAmount;

        // خطوة 5 (جزء ثانٍ): حساب تكلفة الشحن عند اختيار "توصيل للعنوان"
        // عبر شركة الشحن المفعّلة التابعة للمتجر (حسب إعدادات الأسعار لكل مدينة)
        decimal shippingCost = 0;
        if (shippingMethod == ShippingMethodType.DeliveryToAddress)
        {
            // فرض ميزة الباقة: حساب تكلفة الشحن يتطلب ميزة "حاسبة الشحن"
            if (!(package?.HasShippingCalculator ?? false))
                throw new InvalidOperationException("حاسبة الشحن غير متاحة في باقتك الحالية. قم بترقية باقتك لتفعيلها.");

            // العميل لا يختار شركة الشحن — المالك هو من يحددها من إعدادات المتجر.
            // نختار دائمًا الشركة الافتراضية، أو أول شركة مفعّلة للمتجر لو مفيش شركة افتراضية.
            // (أي شركة يرسلها العميل في الطلب يتم تجاهلها عمدًا).
            ShippingCompany shippingCompany = await _context.ShippingCompanies
                .Where(c => c.StoreId == store.Id && c.Enabled)
                .OrderBy(c => c.IsDefault ? 0 : 1)
                .ThenBy(c => c.Id)
                .FirstOrDefaultAsync()
                ?? throw new InvalidOperationException("لا توجد شركة شحن مفعّلة لهذا المتجر — يرجى التواصل مع المتجر");

            // ⚠️ إصلاح الوزن: يُحسب تلقائيًا من أوزان المنتجات في السلة (عدد × وزن المنتج)،
            // العميل لا يدخل الوزن بنفسه.
            var weight = cart.Items.Sum(i => i.Quantity * (i.Product.Weight ?? 1));
            var city = Domain.Entities.Shipping.ShipmentHelpers.ParseCity(dto.ShippingAddress);
            shippingCost = Shipping.ShippingCostCalculator.Calculate(
                shippingCompany.RateConfigJson,
                city,
                weight,
                paymentMethod == PaymentMethodType.CashOnDelivery ? totalAmount : null);

            // فرض ميزة الباقة: "الشحن المجاني" (تكلفة شحن صفرية) يتطلب الميزة
            if (shippingCost <= 0 && !(package?.HasFreeShipping ?? false))
                throw new InvalidOperationException("الشحن المجاني غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");

            // فرض ميزة الباقة: خصومات الشحن (حد شحن مجاني / خصم نسبة) تتطلب الميزة
            if (package?.HasShippingDiscounts == true)
            {
                if (store.FreeShippingThreshold.HasValue && totalAmount >= store.FreeShippingThreshold.Value)
                {
                    shippingCost = 0;
                }
                else if (store.ShippingDiscountPercent is > 0)
                {
                    shippingCost = Math.Max(0m, shippingCost * (1 - store.ShippingDiscountPercent.Value / 100m));
                }
            }
        }

        // ⚠️ إصلاح التناقض الضريبي: المتاجر المسجلة ضريبيًا (زاتكا) كانت تبيع بدون ضريبة في
        // السلة بينما الترحيل المحاسبي يضيف 15% → الفاتورة أكبر من المدفوع فعلاً.
        // الآن تُضاف الضريبة على نفس الإجمالي وبالطريقة نفسها في مكانَي الحساب (السلة + المحاسبة).
        var taxAmount = store.IsVatRegistered ? Math.Round((totalAmount) * VatRate, 2) : 0m;

        var totalAmountWithShipping = totalAmount + shippingCost + taxAmount;

        // ⚠️ فرض حد الطلبات الشهري من الباقة (MaxOrdersPerMonth)
        if (package?.MaxOrdersPerMonth is > 0)
        {
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var ordersThisMonth = await _context.Orders
                .CountAsync(o => o.StoreId == store.Id && o.CreatedAt >= monthStart);
            if (ordersThisMonth >= package.MaxOrdersPerMonth)
                throw new InvalidOperationException(
                    $"لقد وصلت للحد الأقصى للطلبات الشهرية ({package.MaxOrdersPerMonth} طلب) في باقتك الحالية. قم بترقية باقتك لرفع الحد.");
        }

        // --- بداية مرحلة الكتابة الفعلية (Transaction) ---

        // ⚠️ إصلاح ثغرة "شراء مجاني" (أولوية قصوى): طرق الدفع الإلكترونية (بطاقة/PayPal)
        // والحوالة البنكية لا تُخصم المخزون هنا إطلاقًا — يُنشأ الطلب بحالة PendingPayment
        // ويبقى بدون خصم حتى يصلك تأكيد الدفع الفعلي من بوابة الدفع (webhook/فحص الحالة
        // أو تأكيد التاجر للحوالة). هكذا لو لم يُكمل العميل الدفع أو فشل/أُلغي، يظل الطلب
        // معلقًا بدون أي خصم مخزون. الدفع عند الاستلام (COD) فقط يخصم فورًا (دفع عند التوصيل).
        var isDeferredStockPayment = paymentMethod is PaymentMethodType.CreditCard
            or PaymentMethodType.PayPal
            or PaymentMethodType.BankTransfer;

        var orderInitialStatus = isDeferredStockPayment ? OrderStatus.PendingPayment : OrderStatus.New;

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            // خطوة 6: إنشاء Order
            var orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmss}{Random.Shared.Next(100, 999)}";

            var order = new Order
            {
                OrderNumber = orderNumber,
                StoreId = store.Id,
                CustomerId = customerId,
                GuestName = customerId == null ? dto.GuestName : null,
                GuestPhone = customerId == null ? dto.GuestPhone : null,
                GuestEmail = customerId == null ? dto.GuestEmail : null,
                ShippingAddress = dto.ShippingAddress,
                Status = orderInitialStatus,
                SubTotal = subTotal,
                DiscountAmount = discountAmount,
                ShippingCost = shippingCost,
                TotalAmount = totalAmountWithShipping,
                CouponId = appliedCoupon?.Id,
                Notes = dto.Notes,
                ShippingMethodType = shippingMethod,
                PaymentMethodType = paymentMethod
            };
            _context.Orders.Add(order);
            await _context.SaveChangesAsync();

            // خطوة 6 (تابع): OrderItems بـ Snapshot للاسم والسعر
            foreach (var item in cart.Items)
            {
                _context.OrderItems.Add(new OrderItem
                {
                    OrderId = order.Id,
                    ProductId = item.ProductId,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = item.Product.NameAr,
                    Quantity = item.Quantity,
                    UnitPriceSnapshot = item.PriceAtAdd,
                    LineTotal = item.PriceAtAdd * item.Quantity
                });
            }

            // خطوة 7: أول سجل حالة
            _context.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                Status = order.Status,
                ChangedByUserId = customerId,
                ChangedAt = DateTime.UtcNow
            });

            // ⚠️ خصم الكمية فعليًا داخل المعاملة مع قفل على مستوى الصف (UPDLOCK):
            // يُنفَّذ فقط لطرق الدفع غير المؤجلة (COD) — الطلبات الإلكترونية/الحوالة
            // تخصم بعد تأكيد الدفع فقط (في مسار الدفع)، فلا يُحبس مخزون بدون تحصيل.
            if (!isDeferredStockPayment)
            {
                await _orderStockService.DeductStockAsync(order, customerId);
            }

            // خطوة 9: تسجيل الاستخدام الفعلي للكوبون (تحديث السجل الموجود بهوية العميل/الضيف)
            if (couponUsage != null)
            {
                couponUsage.CustomerId = customerId;
                couponUsage.GuestPhone = customerId == null ? dto.GuestPhone : null;
            }

            // خطوة 10: مسح السلة (حذف العناصر فعليًا)
            _context.CartItems.RemoveRange(cart.Items);

            await _context.SaveChangesAsync();

            // ⚠️ رابط الدفع الإلكتروني يُنشأ داخل المعاملة: فشل إنشائه يُلغي الطلب كاملًا
            // (لا يُسجَّل الطلب ولا يُخصم المخزون عند فشل إنشاء رابط الدفع)
            string? paymentLinkUrl = null;
            string? paymentMessage = null;
            FatooraRahatak.Application.DTOs.Payment.BankTransferInfoDto? bankTransfer = null;

            // 🔔 Webhook حقيقي من بوابة الدفع: يُرسَل callback_url مع الفاتورة حتى يُخطرنا
            // خادم موياسر نفسه عند اكتمال الدفع (وليس الاعتماد على متصفح العميل فقط).
            // لا يُخصم المخزون ولا يُؤكَّد الطلب إلا عند استلام هذا التأكيد من البوابة.
            var paymentCallbackUrl = (_config["App:BaseUrl"] ?? "https://your-domain.com")
                .TrimEnd('/') + "/api/v1/payments/webhook";

            // 💳 طرق الدفع الإلكترونية (بطاقة عبر ميسرة / PayPal) تُنشئ رابط دفع ليكمله العميل
            if (paymentMethod == PaymentMethodType.CreditCard || paymentMethod == PaymentMethodType.PayPal)
            {
                var storeFrontBase = (_config["App:StoreFrontBaseUrl"] ?? "http://localhost:3000").TrimEnd('/');
                var successUrl = $"{storeFrontBase}/store/{slug}/thank-you/{order.OrderNumber}";

                var link = await _paymentService.CreatePaymentLinkAsync(new CreatePaymentDto
                {
                    OrderId = order.Id,
                    Amount = order.TotalAmount,
                    Currency = string.IsNullOrWhiteSpace(store.Currency) ? "SAR" : store.Currency,
                    Description = $"دفع الطلب {order.OrderNumber}",
                    CustomerEmail = customerId != null ? null : dto.GuestEmail,
                    CustomerName = customerId != null ? null : dto.GuestName,
                    CustomerPhone = customerId != null ? null : dto.GuestPhone,
                    SuccessUrl = successUrl,
                    CallbackUrl = paymentCallbackUrl
                });
                if (link.Success)
                    paymentLinkUrl = link.PaymentLinkUrl;
                else
                    throw new InvalidOperationException(link.Message ?? "فشل إنشاء رابط الدفع");
            }

            // 🏦 الحوالة البنكية اليدوية: يُسجَّل الطلب كمعلّق دفع ويظهر للعميل بيانات الحساب
            // وإيصال تحويل يمكن رفعه — التأكيد النهائي يتم يدويًا من التاجر في لوحة التحكم.
            if (paymentMethod == PaymentMethodType.BankTransfer)
            {
                var link = await _paymentService.CreatePaymentLinkAsync(new CreatePaymentDto
                {
                    OrderId = order.Id,
                    Amount = order.TotalAmount,
                    Currency = string.IsNullOrWhiteSpace(store.Currency) ? "SAR" : store.Currency,
                    Description = $"دفع الطلب {order.OrderNumber} بالحوالة البنكية",
                    SuccessUrl = null,
                    CallbackUrl = paymentCallbackUrl
                });
                if (link.Success)
                {
                    bankTransfer = link.BankTransfer;
                    paymentMessage = link.Message;
                }
                else
                {
                    throw new InvalidOperationException(link.Message ?? "فشل تسجيل الحوالة البنكية");
                }
            }

            // ⚠️ الترحيل المحاسبي: طلبات الدفع عند الاستلام (COD) تُرحَّل فورًا (إيراد مستحق التحصيل)،
            // بينما الطلبات الإلكترونية تُرحَّل بعد تأكيد الدفع فقط — لا إثبات إيراد قبل التحصيل.
            if (paymentMethod == PaymentMethodType.CashOnDelivery)
                await _accountingService.CreateSalesInvoiceForOrderAsync(store.Id, order.Id);

            await transaction.CommitAsync();

            // ⚠️ إضافة (ربط الإشعارات): إشعار الـ Owner بطلب جديد بعد نجاح الـ Checkout.
            // للطلبات المؤجلة الدفع (بطاقة/PayPal/حوالة) الطلب لسه مش مؤكد فعليًا —
            // الرسالة توضح إنه بانتظار الدفع حتى لا يظن التاجر إن الطلب مؤكد ومدفوع.
            try
            {
                if (store.OwnerUserId != 0)
                {
                    var (title, message) = isDeferredStockPayment
                        ? ("طلب جديد (بانتظار الدفع)",
                           $"طلب جديد رقم {order.OrderNumber} بقيمة {order.TotalAmount} ر.س — لم يكتمل الدفع بعد")
                        : ("طلب جديد",
                           $"تم استلام طلب جديد رقم {order.OrderNumber} بقيمة {order.TotalAmount} ر.س");

                    await _notificationService.CreateAsync(
                        store.OwnerUserId,
                        title,
                        message,
                        NotificationType.OrderCreated,
                        $"/dashboard/orders/{order.Id}");
                }
            }
            catch { }

            // ⚠️ إضافة (إشعارات العملاء): إشعار العميل بالطلب عبر البريد و/أو واتساب
            // بناءً على تفعيل CustomerNotificationEmail / CustomerNotificationWhatsapp في إعدادات المتجر
            try
            {
                if (store.CustomerNotificationEmail || store.CustomerNotificationWhatsapp)
                {
                    await _customerNotificationService.SendOrderCreatedNotificationAsync(store, order);
                }
            }
            catch { }

            // ⚠️ التحقق من المخزون المنخفض بعد خصم الكميات
            try
            {
                var lowStockProductIds = stockRowsPerItem
                    .Where(kv => kv.Value.Sum(s => s.QuantityAvailable) <= (store.LowStockThreshold ?? 5))
                    .Select(kv => kv.Key)
                    .ToList();

                if (lowStockProductIds.Count > 0)
                {
                    var productNames = await _context.Products
                        .Where(p => lowStockProductIds.Contains(p.Id))
                        .ToDictionaryAsync(p => p.Id, p => p.NameAr);

                    foreach (var productId in lowStockProductIds)
                    {
                        if (productNames.TryGetValue(productId, out var name))
                        {
                            var totalQty = stockRowsPerItem[productId].Sum(s => s.QuantityAvailable);
                            await _notificationService.CreateAsync(
                                store.OwnerUserId,
                                "تنبيه مخزون منخفض",
                                $"المنتج \"{name}\" تبقى منه {totalQty} قطع فقط",
                                NotificationType.LowStock,
                                $"/dashboard/products/{productId}");
                        }
                    }
                }
            }
            catch { }

            // خطوة 12: إرجاع تأكيد الطلب
            return new OrderConfirmationDto
            {
                OrderId = order.Id,
                OrderNumber = order.OrderNumber,
                SubTotal = order.SubTotal,
                DiscountAmount = order.DiscountAmount,
                ShippingCost = order.ShippingCost,
                TaxAmount = taxAmount,
                TotalAmount = order.TotalAmount,
                PaymentLinkUrl = paymentLinkUrl,
                PaymentMessage = paymentMessage,
                PaymentMethod = paymentMethod.ToString(),
                BankTransfer = bankTransfer,
                Status = order.Status.ToString()
            };
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    // --- تاسك 6: إدارة الطلبات لصاحب المتجر ---

    public async Task<PagedResult<OwnerOrderListDto>> GetOwnerOrdersAsync(long storeId, string? status, int page = 1, int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Where(o => o.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<OrderStatus>(status, true, out var statusEnum))
                throw new InvalidOperationException("حالة الطلب غير صحيحة");

            query = query.Where(o => o.Status == statusEnum);
        }

        var totalCount = await query.CountAsync();

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var items = orders.Select(o => new OwnerOrderListDto
        {
            Id = o.Id,
            OrderNumber = o.OrderNumber,
            CustomerName = o.CustomerId != null ? o.Customer!.FullName : (o.GuestName ?? "غير معروف"),
            TotalAmount = o.TotalAmount,
            Status = o.Status.ToString(),
            ItemsCount = o.Items.Count,
            CreatedAt = o.CreatedAt
        }).ToList();

        return new PagedResult<OwnerOrderListDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = items
        };
    }

    public async Task<OwnerOrderDetailDto?> GetOwnerOrderDetailAsync(long storeId, long orderId)
    {
        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.StatusHistory)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.ShippingCompany)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.Events)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);

        if (order == null) return null;

        var bankPayment = await _context.Payments
            .Where(p => p.OrderId == order.Id && p.ProviderType == PaymentProviderType.BankTransfer)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        var storeForBank = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);

        return new OwnerOrderDetailDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            CustomerName = order.CustomerId != null ? order.Customer!.FullName : (order.GuestName ?? "غير معروف"),
            CustomerPhone = order.CustomerId != null ? order.Customer!.Phone : order.GuestPhone,
            CustomerEmail = order.CustomerId != null ? order.Customer!.Email : order.GuestEmail,
            IsGuest = order.CustomerId == null,
            ShippingAddress = order.ShippingAddress,
            Notes = order.Notes,
            ShippingMethod = order.ShippingMethodType?.ToString(),
            PaymentMethod = order.PaymentMethodType?.ToString(),
            PaymentStatus = order.PaymentStatus.ToString(),
            BankTransfer = order.PaymentMethodType == PaymentMethodType.BankTransfer && storeForBank != null
                ? new FatooraRahatak.Application.DTOs.Payment.BankTransferInfoDto
                {
                    BankName = storeForBank.PayoutBankName,
                    AccountHolder = storeForBank.PayoutAccountHolder,
                    Iban = storeForBank.PayoutIban,
                    ReceiptUrl = bankPayment?.BankReceiptUrl,
                    TransferReference = bankPayment?.BankTransferReference
                }
                : null,
            Status = order.Status.ToString(),
            SubTotal = order.SubTotal,
            DiscountAmount = order.DiscountAmount,
            TotalAmount = order.TotalAmount,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new OwnerOrderItemDto
            {
                ProductId = i.ProductId,
                ProductNameSnapshot = i.ProductNameSnapshot,
                Quantity = i.Quantity,
                UnitPriceSnapshot = i.UnitPriceSnapshot,
                LineTotal = i.LineTotal
            }).ToList(),
            StatusHistory = order.StatusHistory
                .OrderBy(h => h.ChangedAt)
                .Select(h => new OwnerOrderStatusHistoryDto
                {
                    Status = h.Status.ToString(),
                    ChangedAt = h.ChangedAt
                }).ToList(),
            Shipments = order.Shipments
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new OwnerOrderShipmentDto
                {
                    Id = s.Id,
                    OrderId = s.OrderId,
                    ShippingCompanyId = s.ShippingCompanyId,
                    ShippingCompanyName = s.ShippingCompany?.Name ?? string.Empty,
                    ShippingCompanyCode = s.ShippingCompany?.Code.ToString() ?? string.Empty,
                    Awb = s.Awb,
                    Status = s.Status.ToString(),
                    LabelUrl = s.LabelUrl,
                    DestinationCity = s.DestinationCity,
                    Weight = s.Weight,
                    CodAmount = s.CodAmount,
                    ShippingCost = s.ShippingCost,
                    IsSimulation = s.IsSimulation,
                    CreatedAt = s.CreatedAt,
                    LastSyncedAt = s.LastSyncedAt,
                    Events = s.Events
                        .OrderByDescending(e => e.EventAt)
                        .Select(e => new OwnerOrderShipmentEventDto
                        {
                            Id = e.Id,
                            EventCode = e.EventCode,
                            Description = e.Description,
                            EventAt = e.EventAt
                        }).ToList()
                }).ToList()
        };
    }

    public async Task UpdateOrderStatusAsync(long storeId, long orderId, long? changedByUserId, string newStatus)
    {
        if (!Enum.TryParse<OrderStatus>(newStatus, true, out var statusEnum))
            throw new InvalidOperationException("حالة الطلب غير صحيحة");

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        if (statusEnum is OrderStatus.Cancelled or OrderStatus.Returned or OrderStatus.PendingRefund or OrderStatus.PendingPayment)
            throw new InvalidOperationException("هذه الحالة تُدار تلقائيًا من النظام — استخدم زر الإلغاء أو طلب الإرجاع");

        if (order.Status == statusEnum)
            return;

        order.Status = statusEnum;
        order.UpdatedAt = DateTime.UtcNow;

        _context.OrderStatusHistories.Add(new OrderStatusHistory
        {
            OrderId = order.Id,
            Status = statusEnum,
            ChangedByUserId = changedByUserId,
            ChangedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        // إشعار العميل بتحديث حالة الطلب (بريد و/أو واتساب حسب إعدادات المتجر)
        var store = await _context.Stores.FindAsync(storeId);
        if (store != null)
        {
            try
            {
                if (store.CustomerNotificationEmail || store.CustomerNotificationWhatsapp)
                {
                    await _customerNotificationService.SendOrderStatusNotificationAsync(store, order, statusEnum);
                }
            }
            catch { }
        }
    }

    public async Task CancelOrderAsync(long storeId, long orderId, long? changedByUserId)
    {
        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        if (order.Status is OrderStatus.Shipped or OrderStatus.Delivered or OrderStatus.Cancelled or OrderStatus.Returned)
            throw new InvalidOperationException($"لا يمكن إلغاء طلب بحالة {order.Status}");

        // ⚠️ الإلغاء لا يرجع مخزونًا ولا يعكس قيدًا محاسبيًا للطلبات التي لم يُخصم
        // مخزونها أصلًا (حالة PendingPayment = الدفع لم يُؤكَّد بعد) — وإلا ستُضاف
        // كميات لم تكن خُصمت أصلًا وستضيع من المخزون الفعلي.
        var originalStatus = order.Status;
        var stockWasDeducted = originalStatus != OrderStatus.PendingPayment;

        // ⚠️ طلب مدفوع إلكترونيًا: استرداد تلقائي أولًا، وإلا ينتقل لحالة PendingRefund
        // ولا يُعاد المخزون إلا بعد نجاح الاسترداد الفعلي.
        if (order.PaymentStatus == PaymentStatus.Paid)
        {
            var paidPayment = await _context.Payments
                .FirstOrDefaultAsync(p => p.OrderId == order.Id
                    && p.Status == PaymentStatus.Paid
                    && !string.IsNullOrWhiteSpace(p.ProviderPaymentId));

            if (paidPayment != null)
            {
                var refund = await _paymentService.RefundPaymentAsync(storeId, paidPayment.PaymentReference);
                if (refund.Status != PaymentStatus.Refunded.ToString())
                {
                    order.Status = OrderStatus.PendingRefund;
                    order.UpdatedAt = DateTime.UtcNow;
                    _context.OrderStatusHistories.Add(new OrderStatusHistory
                    {
                        OrderId = order.Id,
                        Status = OrderStatus.PendingRefund,
                        ChangedByUserId = changedByUserId,
                        ChangedAt = DateTime.UtcNow
                    });
                    await _context.SaveChangesAsync();
                    throw new InvalidOperationException($"تعذر إتمام الاسترداد تلقائيًا: {refund.Message}. تم تحويل الطلب لحالة انتظار الاسترداد.");
                }
            }
            else
            {
                order.Status = OrderStatus.PendingRefund;
                order.UpdatedAt = DateTime.UtcNow;
                _context.OrderStatusHistories.Add(new OrderStatusHistory
                {
                    OrderId = order.Id,
                    Status = OrderStatus.PendingRefund,
                    ChangedByUserId = changedByUserId,
                    ChangedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();
                throw new InvalidOperationException("الطلب مدفوع ولا يمكن إلغاؤه قبل استرداد المبلغ. تم تحويله لحالة انتظار الاسترداد.");
            }
        }

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            order.Status = OrderStatus.Cancelled;
            order.UpdatedAt = DateTime.UtcNow;

            _context.OrderStatusHistories.Add(new OrderStatusHistory
            {
                OrderId = order.Id,
                Status = OrderStatus.Cancelled,
                ChangedByUserId = changedByUserId,
                ChangedAt = DateTime.UtcNow
            });

            if (stockWasDeducted)
            {
                await RestockItemsAsync(order, changedByUserId);

                // ⚠️ عكس قيد البيع (ذمم مدينة/نقدية/إيراد) لأن البضاعة عادت للمخزون —
                // للدفع الإلكتروني يكون العكس قد تم داخل RefundPaymentAsync، والـ دالة
                // آمنة للاستدعاء المتكرر (تتجاهل القيود التي سبق عكسها).
                await _accountingService.ReverseOrderSalesInvoiceAsync(storeId, order.Id);
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        var store = await _context.Stores.FindAsync(storeId);
        if (store != null)
        {
            try
            {
                if (store.CustomerNotificationEmail || store.CustomerNotificationWhatsapp)
                {
                    await _customerNotificationService.SendOrderStatusNotificationAsync(store, order, OrderStatus.Cancelled);
                }
            }
            catch { }
        }
    }

    public async Task CancelOrderPublicAsync(string slug, string orderNumber, string phone)
    {
        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.StoreId == store.Id && o.OrderNumber == orderNumber);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        var normalizedPhone = new string(phone.Where(char.IsDigit).ToArray()).TrimStart('0');
        var orderGuestPhone = order.GuestPhone != null
            ? new string(order.GuestPhone.Where(char.IsDigit).ToArray()).TrimStart('0')
            : null;

        // ⚠️ مطابقة العميل بالطلب: طلبات الحساب المسجّل تُطابق عبر CustomerId (وليس GuestPhone،
        // فهو null دائمًا للطلبات المنشأة بتسجيل دخول) — كانت المطابقة بالجوال فقط ترفض إلغاء
        // طلبات العملاء المسجّلين فتبقى حالتهم كما هي ولا يعود المخزون.
        var matchingUser = (await _context.Users
            .AsNoTracking()
            .Where(u => u.Phone != null)
            .ToListAsync())
            .FirstOrDefault(u =>
                new string(u.Phone!.Where(char.IsDigit).ToArray()).TrimStart('0') == normalizedPhone);
        var userId = matchingUser?.Id;

        var isOwned = (order.CustomerId != null && userId != null && order.CustomerId == userId)
            || (order.CustomerId == null && orderGuestPhone != null && orderGuestPhone == normalizedPhone);

        if (!isOwned)
            throw new InvalidOperationException("رقم الجوال غير مطابق لبيانات الطلب");

        await CancelOrderAsync(store.Id, order.Id, null);
    }

    public async Task RequestReturnAsync(string slug, long? customerId, RequestReturnDto dto)
    {
        if (dto.OrderId <= 0 || string.IsNullOrWhiteSpace(dto.Reason))
            throw new InvalidOperationException("رقم الطلب وسبب الإرجاع مطلوبان");

        var store = await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == dto.OrderId && o.StoreId == store.Id);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        if (order.Status != OrderStatus.Delivered)
            throw new InvalidOperationException("يمكن طلب الإرجاع فقط للطلبات التي تم استلامها");

        if (customerId == null)
        {
            if (string.IsNullOrWhiteSpace(dto.GuestPhone) || order.GuestPhone != dto.GuestPhone)
                throw new InvalidOperationException("رقم الجوال غير مطابق لبيانات الطلب");
        }
        else if (order.CustomerId != customerId)
        {
            throw new InvalidOperationException("لا يمكنك طلب إرجاع طلب لا يخصك");
        }

        var hasPending = await _context.ReturnRequests
            .AnyAsync(r => r.OrderId == order.Id && r.Status == Domain.Enums.ReturnRequestStatus.Pending);
        if (hasPending)
            throw new InvalidOperationException("يوجد طلب إرجاع قيد المراجعة لهذا الطلب بالفعل");

        _context.ReturnRequests.Add(new ReturnRequest
        {
            StoreId = store.Id,
            OrderId = order.Id,
            CustomerId = customerId,
            GuestPhone = customerId == null ? dto.GuestPhone : null,
            Reason = dto.Reason.Trim()
        });

        await _context.SaveChangesAsync();

        // إشعار صاحب المتجر بطلب إرجاع جديد
        try
        {
            await _notificationService.CreateAsync(
                store.OwnerUserId,
                "طلب إرجاع جديد",
                $"تم استلام طلب إرجاع للطلب رقم {order.OrderNumber}",
                NotificationType.OrderReturned,
                $"/dashboard/orders/returns");
        }
        catch { }
    }

    public async Task<List<ReturnRequestDto>> GetReturnRequestsAsync(long storeId)
    {
        return await _context.ReturnRequests
            .Include(r => r.Order)
            .Include(r => r.Customer)
            .Where(r => r.StoreId == storeId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new ReturnRequestDto
            {
                Id = r.Id,
                OrderId = r.OrderId,
                OrderNumber = r.Order.OrderNumber,
                CustomerName = r.CustomerId != null ? r.Customer!.FullName : null,
                GuestPhone = r.GuestPhone,
                OrderTotal = r.Order.TotalAmount,
                Reason = r.Reason,
                Status = r.Status.ToString(),
                DecisionNote = r.DecisionNote,
                RefundAmount = r.RefundAmount,
                RefundStatus = r.RefundStatus,
                CreatedAt = r.CreatedAt,
                DecidedAt = r.DecidedAt
            })
            .ToListAsync();
    }

    public async Task HandleReturnRequestAsync(long storeId, long returnRequestId, bool approve, string? note, long? changedByUserId)
    {
        var returnRequest = await _context.ReturnRequests
            .Include(r => r.Order)
                .ThenInclude(o => o.Items)
            .FirstOrDefaultAsync(r => r.Id == returnRequestId && r.StoreId == storeId);
        if (returnRequest == null)
            throw new InvalidOperationException("طلب الإرجاع غير موجود");

        if (returnRequest.Status != Domain.Enums.ReturnRequestStatus.Pending)
            throw new InvalidOperationException("تم البت في هذا الطلب مسبقًا");

        var order = returnRequest.Order;
        if (order.Status == OrderStatus.Returned)
            throw new InvalidOperationException("تم إرجاع هذا الطلب مسبقًا");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            if (approve)
            {
                // ⚠️ طلب مدفوع إلكترونيًا: إتمام الاسترداد أولًا قبل إعادة المخزون،
                // وإلا ينتقل الطلب لحالة PendingRefund دون إعادة مخزون.
                // أما الدفع عند الاستلام (لا توجد دفعة إلكترونية) فيُعاد المخزون مباشرة
                // لأن الاسترداد يتم يدويًا خارج بوابة الدفع.
                var paidPayment = await _context.Payments
                    .FirstOrDefaultAsync(p => p.OrderId == order.Id
                        && p.Status == PaymentStatus.Paid
                        && !string.IsNullOrWhiteSpace(p.ProviderPaymentId));

                if (paidPayment != null)
                {
                    var refund = await _paymentService.RefundPaymentAsync(storeId, paidPayment.PaymentReference);
                    returnRequest.RefundAmount = refund.Amount;
                    returnRequest.RefundStatus = refund.Status == PaymentStatus.Refunded.ToString()
                        ? "تم الاسترداد"
                        : $"تعذر الاسترداد: {refund.Message}";

                    if (refund.Status != PaymentStatus.Refunded.ToString())
                    {
                        order.Status = OrderStatus.PendingRefund;
                        order.UpdatedAt = DateTime.UtcNow;
                        _context.OrderStatusHistories.Add(new OrderStatusHistory
                        {
                            OrderId = order.Id,
                            Status = OrderStatus.PendingRefund,
                            ChangedByUserId = changedByUserId,
                            ChangedAt = DateTime.UtcNow
                        });
                    }
                    else
                    {
                        order.Status = OrderStatus.Returned;
                        order.UpdatedAt = DateTime.UtcNow;
                        _context.OrderStatusHistories.Add(new OrderStatusHistory
                        {
                            OrderId = order.Id,
                            Status = OrderStatus.Returned,
                            ChangedByUserId = changedByUserId,
                            ChangedAt = DateTime.UtcNow
                        });
                        await RestockItemsAsync(order, changedByUserId);
                    }
                }
                else
                {
                    if (order.PaymentStatus == PaymentStatus.Paid)
                        returnRequest.RefundStatus = "دفع عند الاستلام — الاسترداد يتم يدويًا";

                    order.Status = OrderStatus.Returned;
                    order.UpdatedAt = DateTime.UtcNow;
                    _context.OrderStatusHistories.Add(new OrderStatusHistory
                    {
                        OrderId = order.Id,
                        Status = OrderStatus.Returned,
                        ChangedByUserId = changedByUserId,
                        ChangedAt = DateTime.UtcNow
                    });
                    await RestockItemsAsync(order, changedByUserId);

                    // ⚠️ إرجاع مدفوع/COD: عكس قيد البيع (ذمم مدينة/نقدية) لأن البضاعة عادت
                    await _accountingService.ReverseOrderSalesInvoiceAsync(storeId, order.Id);
                }

                returnRequest.Status = Domain.Enums.ReturnRequestStatus.Approved;
            }
            else
            {
                returnRequest.Status = Domain.Enums.ReturnRequestStatus.Rejected;
            }

            returnRequest.DecisionNote = note;
            returnRequest.DecidedByUserId = changedByUserId;
            returnRequest.DecidedAt = DateTime.UtcNow;
            returnRequest.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        // إشعار العميل بقرار الإرجاع
        var store = await _context.Stores.FindAsync(storeId);
        if (store != null)
        {
            try
            {
                if (store.CustomerNotificationEmail || store.CustomerNotificationWhatsapp)
                {
                    await _customerNotificationService.SendReturnDecisionNotificationAsync(
                        store, order, approve, note);
                }
            }
            catch { }
        }
    }

    // إعادة الكمية إلى المخزون (عكس خصم الـ Checkout): تُضاف إلى أول رصيد مطابق في مخزن المتجر
    // المنطق مشترك مع مسار تأكيد الدفع (OrderStockService) ليظل الخصم/الإرجاع متماثلًا تمامًا.
    private async Task RestockItemsAsync(Order order, long? createdByUserId = null)
    {
        await _orderStockService.RestockAsync(order, createdByUserId);
    }
}