using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class QuickLoginService : IQuickLoginService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IMemoryCache _cache;
    private readonly ICustomerSessionService _customerSessionService;

    public QuickLoginService(AppDbContext context, IEmailService emailService, IMemoryCache cache, ICustomerSessionService customerSessionService)
    {
        _context = context;
        _emailService = emailService;
        _cache = cache;
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

    private static string NormalizeEmail(string email) => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static string Mask(string value, int tail = 3)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length <= tail)
            return value ?? "";
        return value[..^tail] + "***";
    }

    private static string MaskEmail(string email)
    {
        var at = email.IndexOf('@');
        if (at <= 1) return Mask(email);
        var local = email[..at];
        var domain = email[at..];
        var visible = local.Length <= 2 ? local[..1] : local[..2];
        return $"{visible}***{domain}";
    }

    // 📧 الدخول السريع في المتجر أصبح بالكامل مبنيًا على البريد الإلكتروني بدل رقم الجوال:
    // العميل بيدخل إيميله، الكود بيتبعت على نفس الإيميل، والتحقق بيتم بمطابقة الإيميل.
    // بنستخرج رقم جوال العميل (لو موجود عنده من قبل) عشان نستخدمه فقط في تعريف جلسة العميل
    // الداخلية (SessionToken)، عشان باقي مميزات المتجر (طلباتي، إلغاء الطلب، عرض الطلب...)
    // اللي مبنية على نفس آلية الجلسة تفضل شغالة زي ما هي من غير أي تعديل فيها.
    public async Task<QuickLoginSendResultDto> SendOtpAsync(string slug, string email)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(normalized) || !normalized.Contains('@') || !normalized.Contains('.'))
            throw new InvalidOperationException("البريد الإلكتروني غير صحيح");

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalized);

        var guest = await _context.Orders
            .AsNoTracking()
            .Where(o => o.StoreId == store.Id && o.GuestEmail != null && o.GuestEmail.ToLower() == normalized)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync();

        var name = user?.FullName ?? guest?.GuestName;

        var code = Random.Shared.Next(100000, 999999).ToString();
        _cache.Set(GetCacheKey(store.Id, normalized), code, TimeSpan.FromMinutes(10));

        try
        {
            var (subject, body) = EmailMessageFactory.QuickLoginOtp(store.StoreName, code);
            await _emailService.SendTemplatedEmailAsync(normalized, subject, body);
        }
        catch (InvalidOperationException)
        {
            throw new InvalidOperationException("تعذر إرسال رمز الدخول إلى بريدك الإلكتروني، حاول مرة أخرى لاحقًا");
        }

        return new QuickLoginSendResultDto
        {
            Sent = true,
            Channel = "email",
            MaskedContact = MaskEmail(normalized),
            CustomerFound = user != null || guest != null,
            CustomerName = name
        };
    }

    public async Task<QuickLoginCustomerDto?> VerifyOtpAsync(string slug, string email, string code)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizeEmail(email);
        var key = GetCacheKey(store.Id, normalized);

        if (!_cache.TryGetValue(key, out string? stored) || stored != code)
            throw new InvalidOperationException("رمز التحقق غير صحيح أو منتهي الصلاحية");

        _cache.Remove(key);
        var customer = await GetCustomerByEmailAsync(slug, normalized);
        if (customer != null)
        {
            var sessionIdentifier = string.IsNullOrWhiteSpace(customer.Phone) ? normalized : customer.Phone;
            customer.SessionToken = _customerSessionService.IssueToken(store.Id, sessionIdentifier);
        }
        return customer;
    }

    public async Task<QuickLoginCustomerDto?> GetCustomerByEmailAsync(string slug, string email)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير متاح حاليًا");

        var normalized = NormalizeEmail(email);
        if (string.IsNullOrWhiteSpace(normalized) || !normalized.Contains('@'))
            throw new InvalidOperationException("البريد الإلكتروني غير صحيح");

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalized);

        var orderCandidates = await _context.Orders
            .AsNoTracking()
            .Where(o => o.StoreId == store.Id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        // ⚠️ نفس معايير المطابقة المستخدمة سابقًا مع الجوال: تطابق الطلبات المسجّلة
        // بمعرّف العميل، وأيضًا طلبات الضيف بنفس الإيميل حتى لو وُجد حساب مسجّل بنفس البريد.
        var matchingOrders = orderCandidates
            .Where(o =>
                (user != null && o.CustomerId == user.Id)
                || (o.GuestEmail != null && NormalizeEmail(o.GuestEmail) == normalized))
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

        string? fullName = user?.FullName;
        string? phone = user?.Phone;
        if (string.IsNullOrWhiteSpace(fullName))
            fullName = lastOrder?.GuestName;
        if (string.IsNullOrWhiteSpace(phone))
            phone = lastOrder?.GuestPhone;

        if (string.IsNullOrWhiteSpace(fullName) && lastOrder == null && recentOrders.Count == 0)
            return null;

        return new QuickLoginCustomerDto
        {
            UserId = user?.Id,
            FullName = fullName ?? "",
            Email = normalized,
            Phone = phone ?? "",
            LastAddress = lastOrder?.ShippingAddress,
            OrderCount = matchingOrders.Count,
            RecentOrders = recentOrders
        };
    }

    // 🔁 بيستخدمها فقط تحديث بيانات الجلسة (quick-login/me) لأن الجلسة القائمة (SessionToken)
    // لسه بتحمل رقم الجوال المشتق وقت التحقق، عشان تفضل باقي endpoints المتجر (الطلبات،
    // إلغاء الطلب، عرض الطلب) شغالة زي ما هي من غير أي تعديل في منطقها.
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

    private static string GetCacheKey(long storeId, string email) => $"quicklogin:{storeId}:{email}";
}