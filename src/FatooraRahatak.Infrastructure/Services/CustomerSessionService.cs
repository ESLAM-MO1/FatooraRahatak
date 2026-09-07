using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.Interfaces;
using Microsoft.Extensions.Options;

namespace FatooraRahatak.Infrastructure.Services;

public class CustomerSessionService : ICustomerSessionService
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(30);
    private readonly byte[] _secret;

    public CustomerSessionService(IOptions<JwtSettings> jwtSettings)
    {
        _secret = Encoding.UTF8.GetBytes(jwtSettings.Value.SecretKey);
    }

    public string IssueToken(long storeId, string phone)
    {
        var payload = JsonSerializer.Serialize(new
        {
            store = storeId,
            phone,
            exp = DateTimeOffset.UtcNow.Add(Lifetime).ToUnixTimeSeconds()
        });
        var payloadB64 = Base64UrlEncode(Encoding.UTF8.GetBytes(payload));
        var sig = Sign(payloadB64);
        return $"{payloadB64}.{sig}";
    }

    public (long StoreId, string Phone)? ValidateToken(string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var parts = token.Split('.');
        if (parts.Length != 2) return null;
        if (!Sign(parts[0]).Equals(parts[1], StringComparison.Ordinal)) return null;

        try
        {
            var json = Encoding.UTF8.GetString(Base64UrlDecode(parts[0]));
            using var doc = JsonDocument.Parse(json);
            var exp = doc.RootElement.GetProperty("exp").GetInt64();
            if (DateTimeOffset.FromUnixTimeSeconds(exp) < DateTimeOffset.UtcNow) return null;
            var store = doc.RootElement.GetProperty("store").GetInt64();
            var phone = doc.RootElement.GetProperty("phone").GetString();
            if (phone == null) return null;
            return (store, phone);
        }
        catch
        {
            return null;
        }
    }

    private string Sign(string payloadB64)
    {
        using var hmac = new HMACSHA256(_secret);
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payloadB64));
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] Base64UrlDecode(string input)
    {
        var s = input.Replace('-', '+').Replace('_', '/');
        switch (s.Length % 4)
        {
            case 2: s += "=="; break;
            case 3: s += "="; break;
        }
        return Convert.FromBase64String(s);
    }
}
