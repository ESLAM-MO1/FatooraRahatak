using System.Security.Cryptography;
using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class StorePaymentCredentialService : IStorePaymentCredentialService
{
    private static readonly PaymentProviderType[] SupportedProviders =
    {
        PaymentProviderType.Tabby,
        PaymentProviderType.Tamara
    };

    private readonly AppDbContext _context;
    private readonly IDataProtector _protector;

    public StorePaymentCredentialService(AppDbContext context, IDataProtectionProvider protectionProvider)
    {
        _context = context;
        _protector = protectionProvider.CreateProtector("StorePaymentCredentials.v1");
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
            PaymentProviderType.Tabby => hasSecret
                && !string.IsNullOrWhiteSpace(row.PublicKey)
                && !string.IsNullOrWhiteSpace(row.MerchantCode),
            PaymentProviderType.Tamara => hasSecret
                && !string.IsNullOrWhiteSpace(row.NotificationTokenEncrypted),
            _ => false
        };
    }

    private static StorePaymentCredentialStatusDto ToStatus(StorePaymentCredential row) => new()
    {
        Provider = row.Provider.ToString(),
        PublicKey = row.PublicKey,
        MerchantCode = row.MerchantCode,
        HasSecretKey = !string.IsNullOrWhiteSpace(row.SecretKeyEncrypted),
        HasNotificationToken = !string.IsNullOrWhiteSpace(row.NotificationTokenEncrypted),
        IsEnabled = row.IsEnabled,
        IsTestMode = row.IsTestMode,
        IsConfigured = IsComplete(row)
    };

    private static StorePaymentCredentialStatusDto EmptyStatus(PaymentProviderType provider) => new()
    {
        Provider = provider.ToString()
    };
}
