using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class QuickLoginService : IQuickLoginService
{
    private readonly AppDbContext _context;
    private readonly IWhatsAppService _whatsAppService;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ICustomerSessionService _customerSessionService;

    public QuickLoginService(AppDbContext context, IWhatsAppService whatsAppService, IEmailService emailService, IMemoryCache cache, IConfiguration configuration, ICustomerSessionService customerSessionService)
    {
        _context = context;
        _whatsAppService = whatsAppService;
        _emailService = emailService;
        _cache = cache;
        _configuration = configuration;
        _customerSessionService = customerSessionService;
    }

    private async Task<Domain.Entities.Stores.Store?> GetOnlineStoreBySlugAsync(string slug)
    {
        return await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active && s.IsOnline);
    }

    // ⚠️ التطبيع منقول الآن إلى PhoneNumberNormalizer المشترك (نفس المنطق تمامًا،
    // بما فيه خاصية "قابل للتكرار": رقم مطبَّع مسبقًا لا يتغيّر عند تطبيعه مجددًا)
    // حتى تستخدم كل خدمات المشروع (QuickLogin، الإرجاع، إلغاء الطلب، عرض تفاصيل الطلب)
    // نفس نقطة المقارنة الواحدة، بدل ما يفشل التحقق في مكان وينجح في مكان بنفس الرقم.
    private static string NormalizePhone(string phone) => PhoneNumberNormalizer.Normalize(phone);

    private static string Mask(string value, int tail = 3)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length <= tail)
            return value ?? "";
        return value[..^tail] + "***";
    }

    public async Task<QuickLoginSendResultDto> SendOtpAsync(string slug, string phone)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizePhone(phone);
        if (normalized.Length < 9)
            throw new InvalidOperationException("رقم الجوال غير صحيح");

        // البحث عن العميل: إما مستخدم مسجّل بنفس الرقم، أو ضيف سبق أن طلب عند هذا المتجر بنفس الرقم
        var user = (await _context.Users
            .AsNoTracking()
            .Where(u => u.Phone != null)
            .ToListAsync())
            .FirstOrDefault(u => NormalizePhone(u.Phone!) == normalized);

        var guest = (await _context.Orders
            .AsNoTracking()
            .Where(o => o.StoreId == store.Id && o.GuestPhone != null)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync())
            .FirstOrDefault(o => NormalizePhone(o.GuestPhone!) == normalized);

        string? name = null;
        string? email = null;
        if (user != null)
        {
            name = user.FullName;
            email = user.Email;
        }
        else if (guest != null)
        {
            name = guest.GuestName;
            email = guest.GuestEmail;
        }

        var code = Random.Shared.Next(100000, 999999).ToString();
        _cache.Set(GetCacheKey(store.Id, normalized), code, TimeSpan.FromMinutes(10));

        // ⚠️ إصلاح تسريب رمز التحقق: رمز التطوير (DevCode) يُرجع في الرد فقط داخل بيئة التطوير،
        // أما في الإنتاج فلا يُكشف الرمز في أي حال — المُرسل إليه يستقبله فقط عبر واتساب/بريد.
        var isDevelopment = string.Equals(
            _configuration["ASPNETCORE_ENVIRONMENT"] ?? System.Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"),
            "Development",
            StringComparison.OrdinalIgnoreCase);

        // قناة الإرسال: واتساب إن كان مُهيأ، وإلا بريد العميل إن وُجد، وإلا رمز تطوير للاختبار
        string? channel = null;
        string? maskedContact = null;
        string? devCode = null;

        var whatsappToken = _configuration["WhatsApp:AccessToken"];
        var whatsappNumberId = _configuration["WhatsApp:PhoneNumberId"];
        if (!string.IsNullOrWhiteSpace(whatsappToken) && !string.IsNullOrWhiteSpace(whatsappNumberId))
        {
            await _whatsAppService.SendTextMessageAsync(normalized,
                $"رمز الدخول السريع الخاص بك في متجر {store.StoreName} هو: {code}\n" +
                $"الرمز صالح لمدة 10 دقائق.");
            channel = "whatsapp";
            maskedContact = Mask(normalized);
        }
        else if (!string.IsNullOrWhiteSpace(email))
        {
            try
            {
                await _emailService.SendEmailAsync(email,
                    $"رمز الدخول السريع - {store.StoreName}",
                    BuildOtpEmailHtml(store.StoreName, code));
                channel = "email";
                maskedContact = Mask(email);
            }
            catch (InvalidOperationException)
            {
                devCode = code;
            }
        }
        else
        {
            devCode = code;
        }

        if (channel == null)
        {
            channel = "dev";
            maskedContact = normalized;
        }

        return new QuickLoginSendResultDto
        {
            Sent = true,
            Channel = channel,
            MaskedContact = maskedContact,
            CustomerFound = user != null || guest != null,
            CustomerName = name,
            DevCode = isDevelopment ? devCode : null
        };
    }

    public async Task<QuickLoginCustomerDto?> VerifyOtpAsync(string slug, string phone, string code)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizePhone(phone);
        var key = GetCacheKey(store.Id, normalized);

        if (!_cache.TryGetValue(key, out string? stored) || stored != code)
            throw new InvalidOperationException("رمز التحقق غير صحيح أو منتهي الصلاحية");

        _cache.Remove(key);
        var customer = await GetCustomerByPhoneAsync(slug, phone);
        if (customer != null)
        {
            customer.SessionToken = _customerSessionService.IssueToken(store.Id, normalized);
        }
        return customer;
    }

    public async Task<QuickLoginCustomerDto?> GetCustomerByPhoneAsync(string slug, string phone)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizePhone(phone);
        if (normalized.Length < 9)
            throw new InvalidOperationException("رقم الجوال غير صحيح");

        var user = (await _context.Users
            .AsNoTracking()
            .Where(u => u.Phone != null)
            .ToListAsync())
            .FirstOrDefault(u => NormalizePhone(u.Phone!) == normalized);

        var orderCandidates = await _context.Orders
            .AsNoTracking()
            .Where(o => o.StoreId == store.Id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        // ⚠️ نفس معايير المطابقة المستخدمة في صفحة "طلباتي" (GetCustomerOrdersAsync):
        // تطابق الطلبات المسجّلة برقم العميل، وأيضًا طلبات الضيف بنفس الجوال حتى لو
        // وُجد حساب مسجّل بهذا الرقم — بدونها كان العداد يظهر 0 للطلبات التي أُنشئت ضيفًا.
        var matchingOrders = orderCandidates
            .Where(o =>
                (user != null && o.CustomerId == user.Id)
                || (o.GuestPhone != null && NormalizePhone(o.GuestPhone!) == normalized))
            .ToList();

        var lastOrder = matchingOrders.FirstOrDefault();

        var recentOrders = matchingOrders
            .Take(5)
            .Select(o => new QuickLoginOrderSummaryDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status.ToString(),
                TotalAmount = o.TotalAmount,
                CreatedAt = o.CreatedAt
            })
            .ToList();

        string? fullName = null;
        string? email = null;
        if (user != null)
        {
            fullName = user.FullName;
            email = user.Email;
        }
        if (string.IsNullOrWhiteSpace(fullName))
            fullName = lastOrder?.GuestName;
        if (string.IsNullOrWhiteSpace(email))
            email = lastOrder?.GuestEmail;

        if (string.IsNullOrWhiteSpace(fullName) && lastOrder == null && recentOrders.Count == 0)
            return null;

        return new QuickLoginCustomerDto
        {
            UserId = user?.Id,
            FullName = fullName ?? "",
            Email = email ?? "",
            Phone = normalized,
            LastAddress = lastOrder?.ShippingAddress,
            OrderCount = matchingOrders.Count,
            RecentOrders = recentOrders
        };
    }

    private static string GetCacheKey(long storeId, string phone) => $"quicklogin:{storeId}:{phone}";

    private static string BuildOtpEmailHtml(string storeName, string code)
    {
        return $@"
<html dir='rtl'><body style='font-family:Tahoma,Arial,sans-serif;background:#f5f6f8;margin:0;padding:24px;'>
  <div style='max-width:480px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e8e9ec;'>
    <div style='background:#1d4ed8;color:#ffffff;padding:18px 24px;'>
      <h2 style='margin:0;font-size:17px;'>رمز الدخول السريع - {storeName}</h2>
    </div>
    <div style='padding:24px;color:#1f2937;text-align:center;'>
      <p style='font-size:14px;margin:0 0 8px;'>رمز الدخول السريع الخاص بك هو:</p>
      <div style='font-size:30px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;direction:ltr;display:inline-block;padding:12px 24px;background:#f3f4f6;border-radius:10px;'>{code}</div>
      <p style='font-size:13px;color:#9ca3af;margin-top:16px;'>الرمز صالح لمدة 10 دقائق.</p>
    </div>
  </div>
</body></html>";
    }
}