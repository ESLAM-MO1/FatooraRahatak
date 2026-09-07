using FatooraRahatak.Application.DTOs.ApiKeys;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace FatooraRahatak.Infrastructure.Services;

public class ApiKeyService : IApiKeyService
{
    private readonly AppDbContext _context;

    public ApiKeyService(AppDbContext context) => _context = context;

    private static readonly char[] Alphabet =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".ToCharArray();

    private static string GenerateKey(int length) =>
        string.Concat(RandomNumberGenerator.GetItems(Alphabet, length));

    private static string MaskSecret(string secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length <= 8) return "••••";
        return "••••••••" + secret[^4..];
    }

    public async Task<StoreApiKeyDto> CreateAsync(long storeId, CreateStoreApiKeyDto dto)
    {
        var store = await _context.Stores.Include(s => s.Package).FirstOrDefaultAsync(s => s.Id == storeId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك");

        // فرض ميزة الباقة: الوصول للـ API يتطلب تفعيل الميزة في الباقة
        if (store.Package == null || !store.Package.HasApiAccess)
            throw new InvalidOperationException("الوصول إلى API المتجر غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");

        var name = dto.Name?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("يجب تسمية المفتاح");

        if (name.Length > 60)
            throw new InvalidOperationException("اسم المفتاح طويل جدًا (الحد الأقصى 60 حرفًا)");

        var key = new StoreApiKey
        {
            StoreId = storeId,
            Name = name,
            PublicKey = "pk_live_" + GenerateKey(24),
            SecretKey = "sk_live_" + GenerateKey(40)
        };

        _context.StoreApiKeys.Add(key);
        await _context.SaveChangesAsync();

        return new StoreApiKeyDto
        {
            Id = key.Id,
            Name = key.Name,
            PublicKey = key.PublicKey,
            SecretKey = key.SecretKey,
            SecretKeyMasked = MaskSecret(key.SecretKey),
            IsRevoked = false,
            LastUsedAt = key.LastUsedAt,
            CreatedAt = key.CreatedAt
        };
    }

    public async Task<List<StoreApiKeyDto>> ListAsync(long storeId)
    {
        var keys = await _context.StoreApiKeys
            .Where(k => k.StoreId == storeId)
            .OrderByDescending(k => k.CreatedAt)
            .Select(k => new { k.Id, k.Name, k.PublicKey, k.SecretKey, k.IsRevoked, k.LastUsedAt, k.CreatedAt })
            .ToListAsync();

        return keys.Select(k => new StoreApiKeyDto
        {
            Id = k.Id,
            Name = k.Name,
            PublicKey = k.PublicKey,
            SecretKeyMasked = MaskSecret(k.SecretKey),
            SecretKey = null,
            IsRevoked = k.IsRevoked,
            LastUsedAt = k.LastUsedAt,
            CreatedAt = k.CreatedAt
        }).ToList();
    }

    public async Task RevokeAsync(long storeId, long id)
    {
        var key = await _context.StoreApiKeys.FirstOrDefaultAsync(k => k.Id == id && k.StoreId == storeId);
        if (key == null)
            throw new InvalidOperationException("المفتاح غير موجود");

        if (!key.IsRevoked)
        {
            key.IsRevoked = true;
            key.RevokedAt = DateTime.UtcNow;
            key.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
    }

    public async Task<long?> ValidateAsync(string publicKey, string secretKey)
    {
        var key = await _context.StoreApiKeys
            .FirstOrDefaultAsync(k => k.PublicKey == publicKey && k.SecretKey == secretKey && !k.IsRevoked);
        if (key == null)
            return null;

        key.LastUsedAt = DateTime.UtcNow;
        key.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return key.StoreId;
    }
}
