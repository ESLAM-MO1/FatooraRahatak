using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class CustomerNotificationService : ICustomerNotificationService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IWhatsAppService _whatsAppService;
    private readonly ILogger<CustomerNotificationService> _logger;

    public CustomerNotificationService(AppDbContext context, IEmailService emailService, IWhatsAppService whatsAppService, ILogger<CustomerNotificationService> logger)
    {
        _context = context;
        _emailService = emailService;
        _whatsAppService = whatsAppService;
        _logger = logger;
    }

    public async Task SendOrderCreatedNotificationAsync(Store store, Order order)
    {
        var items = await _context.OrderItems
            .Where(i => i.OrderId == order.Id)
            .ToListAsync();

        string? customerEmail = null;
        string? customerPhone = null;
        if (order.CustomerId != null)
        {
            var customer = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.CustomerId);
            customerEmail = customer?.Email;
            customerPhone = customer?.Phone;
        }
        else
        {
            customerEmail = order.GuestEmail;
            customerPhone = order.GuestPhone;
        }

        if (store.CustomerNotificationEmail && !string.IsNullOrWhiteSpace(customerEmail))
        {
            try
            {
                var (subject, body) = EmailMessageFactory.OrderConfirmation(store, order, items);
                await _emailService.SendTemplatedEmailAsync(customerEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send order email to {Email} for order {OrderNumber}", customerEmail, order.OrderNumber);
            }
        }

        if (store.CustomerNotificationWhatsapp && !string.IsNullOrWhiteSpace(customerPhone))
        {
            try
            {
                await _whatsAppService.SendTextMessageAsync(
                    NormalizePhone(customerPhone),
                    BuildOrderWhatsAppMessage(store, order, items));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send WhatsApp message to {Phone} for order {OrderNumber}", customerPhone, order.OrderNumber);
            }
        }
    }

    public async Task<string> SendTestNotificationAsync(Store store)
    {
        var owner = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == store.OwnerUserId);

        var emailSent = false;
        var whatsappSent = false;

        if (store.CustomerNotificationEmail)
        {
            if (string.IsNullOrWhiteSpace(store.ContactEmail) && string.IsNullOrWhiteSpace(owner?.Email))
                throw new InvalidOperationException("لا يوجد بريد إلكتروني لاستقبال الرسالة التجريبية. أضف بريد المتجر في إعدادات التواصل.");
            var toEmail = !string.IsNullOrWhiteSpace(store.ContactEmail) ? store.ContactEmail! : owner!.Email!;
            var (testSubject, testBody) = EmailMessageFactory.TestNotification(store.StoreName);
            await _emailService.SendTemplatedEmailAsync(toEmail, testSubject, testBody);
            emailSent = true;
        }

        if (store.CustomerNotificationWhatsapp)
        {
            var toPhone = !string.IsNullOrWhiteSpace(store.ContactPhone) ? store.ContactPhone! : owner?.Phone;
            if (string.IsNullOrWhiteSpace(toPhone))
                throw new InvalidOperationException("لا يوجد رقم جوال لاستقبال الرسالة التجريبية. أضف رقم المتجر في إعدادات التواصل.");
            await _whatsAppService.SendTextMessageAsync(
                NormalizePhone(toPhone),
                $"رسالة تجريبية من {store.StoreName} ✅\n\nتم تفعيل إشعارات واتساب بنجاح. ستصل هذه الرسالة للعملاء عند إنشاء طلب جديد في متجرك.");
            whatsappSent = true;
        }

        if (!emailSent && !whatsappSent)
            throw new InvalidOperationException("فعّل قناة إشعار واحدة على الأقل (بريد أو واتساب) لإرسال الرسالة التجريبية.");

        var parts = new List<string>();
        if (emailSent) parts.Add("البريد الإلكتروني");
        if (whatsappSent) parts.Add("واتساب");
        return $"تم إرسال الرسالة التجريبية بنجاح عبر {string.Join(" و", parts)}.";
    }

    public async Task SendOrderStatusNotificationAsync(Store store, Order order, OrderStatus newStatus)
    {
        var customerEmail = order.CustomerId != null
            ? (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.CustomerId))?.Email
            : order.GuestEmail;
        var customerPhone = order.CustomerId != null
            ? (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.CustomerId))?.Phone
            : order.GuestPhone;

        var statusText = newStatus switch
        {
            OrderStatus.Processing => "قيد التجهيز",
            OrderStatus.Shipped => "تم الشحن",
            OrderStatus.Delivered => "تم التوصيل",
            OrderStatus.Cancelled => "تم الإلغاء",
            OrderStatus.Returned => "تم الإرجاع",
            OrderStatus.PendingRefund => "بانتظار الاسترداد",
            OrderStatus.PendingPayment => "بانتظار الدفع",
            _ => newStatus.ToString()
        };

        if (store.CustomerNotificationEmail && !string.IsNullOrWhiteSpace(customerEmail))
        {
            try
            {
                var (subject, body) = EmailMessageFactory.OrderStatusUpdate(store, order, statusText);
                await _emailService.SendTemplatedEmailAsync(customerEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send status email for order {OrderNumber}", order.OrderNumber);
            }
        }

        if (store.CustomerNotificationWhatsapp && !string.IsNullOrWhiteSpace(customerPhone))
        {
            try
            {
                await _whatsAppService.SendTextMessageAsync(
                    NormalizePhone(customerPhone),
                    $"تحديث حالة الطلب رقم {order.OrderNumber}:\n\n{statusText}\n\nشكرًا لتعاملك مع {store.StoreName}.");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send status WhatsApp for order {OrderNumber}", order.OrderNumber);
            }
        }
    }

    public async Task SendReturnDecisionNotificationAsync(Store store, Order order, bool approved, string? note)
    {
        var customerEmail = order.CustomerId != null
            ? (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.CustomerId))?.Email
            : order.GuestEmail;
        var customerPhone = order.CustomerId != null
            ? (await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == order.CustomerId))?.Phone
            : order.GuestPhone;

        var decisionText = approved
            ? $"تمت الموافقة على طلب إرجاع الطلب رقم {order.OrderNumber}، وسيتم إعادة المبلغ خلال فترة قصيرة."
            : $"تم رفض طلب إرجاع الطلب رقم {order.OrderNumber}.";
        if (!string.IsNullOrWhiteSpace(note))
            decisionText += $"\n\nملاحظة المتجر: {note}";

        if (store.CustomerNotificationEmail && !string.IsNullOrWhiteSpace(customerEmail))
        {
            try
            {
                var (subject, body) = EmailMessageFactory.ReturnRequestDecision(store, order, approved, note);
                await _emailService.SendTemplatedEmailAsync(customerEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send return decision email for order {OrderNumber}", order.OrderNumber);
            }
        }

        if (store.CustomerNotificationWhatsapp && !string.IsNullOrWhiteSpace(customerPhone))
        {
            try
            {
                await _whatsAppService.SendTextMessageAsync(
                    NormalizePhone(customerPhone),
                    $"قرار طلب الإرجاع — الطلب {order.OrderNumber}:\n\n{decisionText}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send return decision WhatsApp for order {OrderNumber}", order.OrderNumber);
            }
        }
    }

    private static string BuildOrderWhatsAppMessage(Store store, Order order, IReadOnlyList<OrderItem> items)
    {
        var lines = string.Join("\n",
            items.Select(i => $"• {i.ProductNameSnapshot} (x{i.Quantity}) = {i.LineTotal.ToString("0.00")} ر.س"));

        return $"مرحبًا بك في {store.StoreName} ✓\n\n" +
               $"تم استلام طلبك رقم {order.OrderNumber} بنجاح ✅\n\n" +
               $"{lines}\n\n" +
               $"الإجمالي: {order.TotalAmount.ToString("0.00")} ر.س\n\n" +
               "شكرًا لثقتك بنا، وسيتم تجهيز طلبك وتوصيله في أقرب وقت. 🚚";
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00"))
            digits = digits.Substring(2);
        if (digits.StartsWith("0"))
            digits = "966" + digits.Substring(1);
        return digits;
    }
}
