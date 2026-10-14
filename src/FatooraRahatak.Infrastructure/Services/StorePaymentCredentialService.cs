using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class StorePaymentCredentialService : IStorePaymentCredentialService
{
    private static readonly PaymentProviderType[] SupportedProviders =
    {
        PaymentProviderType.Moyasar,
        PaymentProviderType.Tabby,
        PaymentProviderType.Tamara
    };

    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(20) };

    private readonly AppDbContext _context;
    private readonly IDataProtector _protector;
    private readonly IConfiguration _config;

    public StorePaymentCredentialService(AppDbContext context, IDataProtectionProvider protectionProvider, IConfiguration config)
    {
        _context = context;
        _protector = protectionProvider.CreateProtector("StorePaymentCredentials.v1");
        _config = config;
    }

    public async Task<List<StorePaymentCredentialStatusDto>> GetStatusesAsync(long storeId)
    {
        var rows = await _context.StorePaymentCredentials
            .AsNoTracking()
            .Where(c => c.StoreId == storeId)
            .ToListAsync();

        var result = new List<StorePaymentCredentialStatusDto>();
        foreach (var provider in SupportedProviders)
        {
            var row = rows.FirstOrDefault(r => r.Provider == provider);
            result.Add(row == null ? EmptyStatus(provider) : ToStatus(row));
        }
        return result;
    }

    public async Task<StorePaymentCredentialStatusDto> SaveAsync(long storeId, SaveStorePaymentCredentialDto dto)
    {
        if (!Enum.TryParse<PaymentProviderType>(dto.Provider, true, out var provider) || !SupportedProviders.Contains(provider))
            throw new InvalidOperationException("مزود الدفع غير مدعوم");

        var row = await _context.StorePaymentCredentials
            .FirstOrDefaultAsync(c => c.StoreId == storeId && c.Provider == provider);

        var isNew = row == null;
        row ??= new StorePaymentCredential { StoreId = storeId, Provider = provider };

        if (!string.IsNullOrWhiteSpace(dto.PublicKey))
            row.PublicKey = dto.PublicKey.Trim();
        if (!string.IsNullOrWhiteSpace(dto.MerchantCode))
            row.MerchantCode = dto.MerchantCode.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SecretKey))
            row.SecretKeyEncrypted = _protector.Protect(System.Text.RegularExpressions.Regex.Replace(dto.SecretKey, "\\s+", ""));
        if (!string.IsNullOrWhiteSpace(dto.NotificationToken))
            row.NotificationTokenEncrypted = _protector.Protect(System.Text.RegularExpressions.Regex.Replace(dto.NotificationToken, "\\s+", ""));

        row.IsTestMode = dto.IsTestMode;
        row.IsEnabled = dto.IsEnabled;
        row.UpdatedAt = DateTime.UtcNow;

        if (row.IsEnabled && !IsComplete(row))
        {
            var name = provider == PaymentProviderType.Tabby ? "تابي" : "تمارا";
            throw new InvalidOperationException($"بيانات {name} ناقصة — أكمل كل الحقول المطلوبة قبل التفعيل");
        }

        if (isNew)
            _context.StorePaymentCredentials.Add(row);

        await _context.SaveChangesAsync();
        return ToStatus(row);
    }

    public async Task<StorePaymentCredentialSecrets?> GetSecretsAsync(long storeId, PaymentProviderType provider)
    {
        var row = await _context.StorePaymentCredentials
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.StoreId == storeId && c.Provider == provider);
        if (row == null) return null;

        return new StorePaymentCredentialSecrets
        {
            Provider = provider.ToString(),
            PublicKey = row.PublicKey,
            SecretKey = Decrypt(row.SecretKeyEncrypted),
            MerchantCode = row.MerchantCode,
            NotificationToken = Decrypt(row.NotificationTokenEncrypted),
            IsEnabled = row.IsEnabled,
            IsTestMode = row.IsTestMode
        };
    }

    public async Task<HashSet<PaymentProviderType>> GetEnabledProvidersAsync(long storeId)
    {
        var rows = await _context.StorePaymentCredentials
            .AsNoTracking()
            .Where(c => c.StoreId == storeId && c.IsEnabled)
            .ToListAsync();

        return rows.Where(IsComplete).Select(r => r.Provider).ToHashSet();
    }

    private string? Decrypt(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        try
        {
            return _protector.Unprotect(value);
        }
        catch (CryptographicException)
        {
            return null;
        }
    }

    private static bool IsComplete(StorePaymentCredential row)
    {
        var hasSecret = !string.IsNullOrWhiteSpace(row.SecretKeyEncrypted);
        return row.Provider switch
        {
            PaymentProviderType.Moyasar => hasSecret,
            PaymentProviderType.Tabby => hasSecret
                && !string.IsNullOrWhiteSpace(row.PublicKey)
                && !string.IsNullOrWhiteSpace(row.MerchantCode),
            PaymentProviderType.Tamara => hasSecret
                && !string.IsNullOrWhiteSpace(row.NotificationTokenEncrypted),
            _ => false
        };
    }

    private StorePaymentCredentialStatusDto ToStatus(StorePaymentCredential row) => new()
    {
        Provider = row.Provider.ToString(),
        PublicKey = row.PublicKey,
        MerchantCode = row.MerchantCode,
        HasSecretKey = !string.IsNullOrWhiteSpace(row.SecretKeyEncrypted),
        HasNotificationToken = !string.IsNullOrWhiteSpace(row.NotificationTokenEncrypted),
        SecretKey = Decrypt(row.SecretKeyEncrypted),
        NotificationToken = Decrypt(row.NotificationTokenEncrypted),
        IsEnabled = row.IsEnabled,
        IsTestMode = row.IsTestMode,
        IsConfigured = IsComplete(row)
    };

    private static StorePaymentCredentialStatusDto EmptyStatus(PaymentProviderType provider) => new()
    {
        Provider = provider.ToString()
    };

    public async Task<TestConnectionResultDto> TestConnectionAsync(TestConnectionDto dto)
    {
        if (!Enum.TryParse<PaymentProviderType>(dto.Provider, true, out var provider) || !SupportedProviders.Contains(provider))
            return new TestConnectionResultDto { Success = false, Message = "مزود الدفع غير مدعوم" };

        var secret = (dto.SecretKey ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(secret))
            return new TestConnectionResultDto { Success = false, Message = "أدخل المفتاح السري أولًا لاختبار الاتصال" };

        try
        {
            switch (provider)
            {
                case PaymentProviderType.Moyasar:
                {
                    var baseUrl = (_config["Moyasar:BaseUrl"] ?? "https://api.moyasar.com/v1").TrimEnd('/');
                    using var req = new HttpRequestMessage(HttpMethod.Get, $"{baseUrl}/invoices?limit=1");
                    req.Headers.Authorization = new AuthenticationHeaderValue(
                        "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{secret}:")));
                    using var resp = await Http.SendAsync(req);
                    if (resp.IsSuccessStatusCode)
                        return new TestConnectionResultDto { Success = true, Message = "تم الاتصال بمويسر بنجاح ✓" };
                    if (resp.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                        return new TestConnectionResultDto { Success = false, Message = "مفتاح Moyasar غير صالح — تأكد من أن المفتاح السري (sk_...) صحيح" };
                    return new TestConnectionResultDto { Success = false, Message = $"مويسر رفض الاتصال (كود {(int)resp.StatusCode})" };
                }
                case PaymentProviderType.Tabby:
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, "https://api.tabby.ai/api/v2/payments/connection-test");
                    req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret);
                    using var resp = await Http.SendAsync(req);
                    if (resp.IsSuccessStatusCode || resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                        return new TestConnectionResultDto { Success = true, Message = "تم الاتصال بتابي بنجاح ✓" };
                    if (resp.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                        return new TestConnectionResultDto { Success = false, Message = "مفتاح Tabby غير صالح — تأكد من Secret Key" };
                    return new TestConnectionResultDto { Success = false, Message = $"تابي رفض الاتصال (كود {(int)resp.StatusCode})" };
                }
                case PaymentProviderType.Tamara:
                {
                    var url = dto.IsTestMode
                        ? "https://sandbox-api.tamara.co/v2/payments/connection-test"
                        : "https://api.tamara.co/v2/payments/connection-test";
                    using var req = new HttpRequestMessage(HttpMethod.Get, url);
                    req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", secret);
                    using var resp = await Http.SendAsync(req);
                    if (resp.IsSuccessStatusCode || resp.StatusCode == System.Net.HttpStatusCode.NotFound)
                        return new TestConnectionResultDto { Success = true, Message = "تم الاتصال بتمارا بنجاح ✓" };
                    if (resp.StatusCode is System.Net.HttpStatusCode.Unauthorized or System.Net.HttpStatusCode.Forbidden)
                        return new TestConnectionResultDto { Success = false, Message = "مفتاح Tamara غير صالح — تأكد من API Token" };
                    return new TestConnectionResultDto { Success = false, Message = $"تمارا رفضت الاتصال (كود {(int)resp.StatusCode})" };
                }
                default:
                    return new TestConnectionResultDto { Success = false, Message = "اختبار الاتصال غير متاح لهذه البوابة" };
            }
        }
        catch (Exception)
        {
            return new TestConnectionResultDto { Success = false, Message = "تعذّر الاتصال بالبوابة — تحقق من اتصال السيرفر بالإنترنت" };
        }
    }
}
