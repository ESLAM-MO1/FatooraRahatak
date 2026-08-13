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
                await _emailService.SendEmailAsync(
                    customerEmail,
                    $"طلب جديد رقم {order.OrderNumber}",
                    BuildOrderEmailHtml(store, order, items));
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
            await _emailService.SendEmailAsync(
                toEmail,
                $"رسالة تجريبية من {store.StoreName}",
                $"<html dir='rtl'><body style='font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;padding:24px;'><div style='max-width:520px;margin:auto;background:#fff;border-radius:14px;padding:24px;border:1px solid #e8e9ec;color:#1f2937;'><h2 style='margin:0 0 8px;color:#1d4ed8;'>رسالة تجريبية ✅</h2><p style='margin:0 0 16px;'>تم تفعيل إشعارات البريد بنجاح. ستصل هذه الرسالة للعملاء عند إنشاء طلب جديد في متجرك.</p><p style='margin:0;color:#6b7280;font-size:12px;'>{store.StoreName}</p></div></body></html>");
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
                await _emailService.SendEmailAsync(
                    customerEmail,
                    $"تحديث حالة الطلب {order.OrderNumber}",
                    BuildStatusEmailHtml(store, order, statusText));
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
                await _emailService.SendEmailAsync(
                    customerEmail,
                    $"قرار طلب الإرجاع — الطلب {order.OrderNumber}",
                    $"<html dir='rtl'><body style='font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;padding:24px;'><div style='max-width:520px;margin:auto;background:#fff;border-radius:14px;padding:24px;border:1px solid #e8e9ec;color:#1f2937;'><h2 style='margin:0 0 8px;color:#1d4ed8;'>{store.StoreName}</h2><p style='margin:0;line-height:1.7;white-space:pre-line;'>{decisionText}</p></div></body></html>");
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

    private static string BuildStatusEmailHtml(Store store, Order order, string statusText)
    {
        return $@"
<html dir='rtl'><body style='font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;margin:0;padding:24px;'>
  <div style='max-width:520px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e9ec;'>
    <div style='background:#1d4ed8;color:#ffffff;padding:20px 24px;'>
      <h2 style='margin:0;font-size:18px;'>تحديث حالة الطلب</h2>
    </div>
    <div style='padding:24px;color:#1f2937;'>
      <p style='margin:0 0 6px;'>رقم الطلب: <b>{order.OrderNumber}</b></p>
      <p style='margin:0 0 16px;'>أصبحت حالة طلبك: <b>{statusText}</b></p>
      <p style='margin:0 0 16px;'>الإجمالي: <b>{order.TotalAmount.ToString("0.00")} ر.س</b></p>
      <p style='margin:0;color:#6b7280;'>{store.StoreName}</p>
    </div>
  </div>
</body></html>";
    }

    private static string BuildOrderEmailHtml(Store store, Order order, IReadOnlyList<OrderItem> items)
    {
        var rows = string.Join("",
            items.Select(i =>
                $"<tr><td style=\"padding:8px;border-bottom:1px solid #eee;\">{i.ProductNameSnapshot}</td>" +
                $"<td style=\"padding:8px;border-bottom:1px solid #eee;text-align:center;\">{i.Quantity}</td>" +
                $"<td style=\"padding:8px;border-bottom:1px solid #eee;text-align:left;direction:ltr;\">{i.UnitPriceSnapshot.ToString("0.00")} ر.س</td></tr>"));

        return $@"
<html dir='rtl'><body style='font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;margin:0;padding:24px;'>
  <div style='max-width:520px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e9ec;'>
    <div style='background:#1d4ed8;color:#ffffff;padding:20px 24px;'>
      <h2 style='margin:0;font-size:18px;'>شكرًا لطلبك من {store.StoreName}</h2>
    </div>
    <div style='padding:24px;color:#1f2937;'>
      <p style='margin:0 0 6px;'>رقم الطلب: <b>{order.OrderNumber}</b></p>
      <p style='margin:0 0 16px;'>تم استلام طلبك بنجاح وسيتم تجهيزه وتوصيله في أقرب وقت.</p>
      <table style='width:100%;border-collapse:collapse;font-size:13px;'>
        <thead><tr style='background:#f9fafb;'>
          <th style='padding:8px;text-align:right;'>المنتج</th>
          <th style='padding:8px;text-align:center;'>الكمية</th>
          <th style='padding:8px;text-align:left;'>السعر</th>
        </tr></thead>
        <tbody>{rows}</tbody>
      </table>
      <div style='margin-top:16px;padding-top:14px;border-top:2px solid #eef0f3;display:flex;justify-content:space-between;font-size:14px;'>
        <b>الإجمالي</b>
        <b>{order.TotalAmount.ToString("0.00")} ر.س</b>
      </div>
    </div>
  </div>
</body></html>";
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
