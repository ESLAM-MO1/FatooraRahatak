using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs.Auth;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly JwtSettings _jwtSettings;

    public AuthService(AppDbContext context, IOptions<JwtSettings> jwtSettings)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var exists = await _context.Users
            .AnyAsync(u => u.Email == dto.Email || u.Phone == dto.Phone);

        if (exists)
            throw new InvalidOperationException("البريد الإلكتروني أو رقم الجوال مستخدم بالفعل");

        var user = new User
        {
            FullName = dto.FullName,
            Email = dto.Email,
            Phone = dto.Phone,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            UserType = UserType.Owner,
            IsActive = true,
            IsVerified = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("البريد الإلكتروني أو كلمة المرور غير صحيحة");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("الحساب معطّل، تواصل مع الدعم الفني");

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(string refreshToken)
    {
        var storedToken = await _context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken);

        if (storedToken == null || storedToken.IsRevoked || storedToken.ExpiresAt < DateTime.UtcNow)
            throw new UnauthorizedAccessException("Refresh Token غير صالح أو منتهي");

        storedToken.IsRevoked = true;
        _context.RefreshTokens.Update(storedToken);
        await _context.SaveChangesAsync();

        return await GenerateAuthResponseAsync(storedToken.User);
    }

    // ============ تفعيل الحساب ============

    public async Task<string> SendVerificationCodeAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        if (user.IsVerified)
            throw new InvalidOperationException("الحساب مفعّل بالفعل");

        var code = GenerateNumericCode();

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            Code = code,
            Type = VerificationCodeType.EmailVerification,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        });

        await _context.SaveChangesAsync();

        // TODO: هنا هيتم إرسال الكود فعليًا عبر SMTP/WhatsApp في معلم 4
        return code;
    }

    public async Task VerifyAccountAsync(VerifyAccountDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        var validCode = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id
                && v.Type == VerificationCodeType.EmailVerification
                && v.Code == dto.Code
                && !v.IsUsed
                && v.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        if (validCode == null)
            throw new InvalidOperationException("رمز التفعيل غير صحيح أو منتهي الصلاحية");

        validCode.IsUsed = true;
        user.IsVerified = true;

        await _context.SaveChangesAsync();
    }

    // ============ استرجاع كلمة المرور ============

    public async Task<string> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("لا يوجد حساب مرتبط بهذا البريد الإلكتروني");

        var code = GenerateNumericCode();

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            Code = code,
            Type = VerificationCodeType.PasswordReset,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        });

        await _context.SaveChangesAsync();

        // TODO: هنا هيتم إرسال الكود فعليًا عبر SMTP/WhatsApp في معلم 4
        return code;
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        var validCode = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id
                && v.Type == VerificationCodeType.PasswordReset
                && v.Code == dto.Code
                && !v.IsUsed
                && v.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        if (validCode == null)
            throw new InvalidOperationException("رمز الاسترجاع غير صحيح أو منتهي الصلاحية");

        validCode.IsUsed = true;
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        // إلغاء كل الجلسات القديمة (Refresh Tokens) لأسباب أمنية
        var oldTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.IsRevoked)
            .ToListAsync();
        foreach (var token in oldTokens)
            token.IsRevoked = true;

        await _context.SaveChangesAsync();
    }

    // ============ Helpers ============

    private static string GenerateNumericCode()
    {
        var randomBytes = new byte[4];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var number = BitConverter.ToUInt32(randomBytes, 0) % 1000000;
        return number.ToString("D6"); // كود من 6 أرقام
    }

    private async Task<AuthResponseDto> GenerateAuthResponseAsync(User user)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshTokenValue = GenerateRefreshTokenValue();
        var expiry = DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryInMinutes);

        var refreshToken = new RefreshToken
        {
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryInDays),
            IsRevoked = false
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        return new AuthResponseDto
        {
            UserId = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            UserType = user.UserType.ToString(),
            AccessToken = accessToken,
            RefreshToken = refreshTokenValue,
            AccessTokenExpiry = expiry
        };
    }

    private string GenerateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
            new(ClaimTypes.Role, user.UserType.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtSettings.SecretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtSettings.Issuer,
            audience: _jwtSettings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwtSettings.ExpiryInMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private string GenerateRefreshTokenValue()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}