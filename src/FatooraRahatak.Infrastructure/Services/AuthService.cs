using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs.Auth;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly string _googleClientId;
    private readonly IInvitationService _invitationService;
    private readonly IEmailService _emailService;

    public AuthService(AppDbContext context, IOptions<JwtSettings> jwtSettings, IConfiguration configuration, IInvitationService invitationService, IEmailService emailService)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
        _googleClientId = configuration["GoogleAuth:ClientId"] ?? string.Empty;
        _invitationService = invitationService;
        _emailService = emailService;
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

        if (!string.IsNullOrEmpty(dto.InvitationToken))
        {
            await _invitationService.AcceptInvitationAsync(dto.InvitationToken, user.Id);
        }

        var code = GenerateNumericCode();
        var codeHash = BCrypt.Net.BCrypt.HashPassword(code);

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            CodeHash = codeHash,
            Type = VerificationCodeType.EmailVerification,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        });

        await _context.SaveChangesAsync();

        var subject = "تفعيل حسابك في فاتورة راحتك";
        var body = $@"
            <div style='font-family:Arial;max-width:480px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px'>
                <h2 style='color:#1a237e;text-align:center'>فاتورة راحتك</h2>
                <p style='font-size:16px;color:#333'>مرحبًا {user.FullName}،</p>
                <p style='font-size:14px;color:#555'>رمز التفعيل الخاص بك هو:</p>
                <div style='text-align:center;margin:24px 0'>
                    <span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a237e;direction:ltr;display:inline-block'>{code}</span>
                </div>
                <p style='font-size:13px;color:#999'>هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
                <hr style='border:none;border-top:1px solid #eee' />
                <p style='font-size:12px;color:#bbb;text-align:center'>© {DateTime.UtcNow.Year} فاتورة راحتك. جميع الحقوق محفوظة.</p>
            </div>";

        try
        {
            await _emailService.SendEmailAsync(user.Email, subject, body);
        }
        catch (InvalidOperationException)
        {
            throw new InvalidOperationException("حصل خطأ في إرسال رمز التفعيل إلى بريدك الإلكتروني، حاول تسجيل الدخول مرة أخرى وسيتم إرسال الرمز");
        }

        var authResponse = await GenerateAuthResponseAsync(user);
        return authResponse;
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user == null)
            throw new UnauthorizedAccessException("البريد الإلكتروني أو كلمة المرور غير صحيحة");

        bool passwordValid;
        try
        {
            passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        }
        catch
        {
            passwordValid = false;
        }

        if (!passwordValid)
            throw new UnauthorizedAccessException("البريد الإلكتروني أو كلمة المرور غير صحيحة");

        if (!user.IsActive)
            throw new UnauthorizedAccessException("الحساب معطّل، تواصل مع الدعم الفني");

        user.LastLoginAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return await GenerateAuthResponseAsync(user);
    }

    public async Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(dto.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { _googleClientId }
            });
        }
        catch (InvalidJwtException ex)
        {
            Console.WriteLine($"GOOGLE AUTH ERROR: {ex.Message}");
            throw new UnauthorizedAccessException($"توكن جوجل غير صالح: {ex.Message}");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == payload.Subject || u.Email == payload.Email);

        if (user == null)
        {
            user = new User
            {
                FullName = payload.Name,
                Email = payload.Email,
                Phone = string.Empty,
                GoogleId = payload.Subject,
                ProfileImage = payload.Picture,
                UserType = UserType.Owner,
                IsActive = true,
                IsVerified = true
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
        }
        else if (user.GoogleId == null)
        {
            user.GoogleId = payload.Subject;
            user.IsVerified = true;
            await _context.SaveChangesAsync();
        }

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

    public async Task SendVerificationCodeAsync(string email)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        if (user.IsVerified)
            throw new InvalidOperationException("الحساب مفعّل بالفعل");

        await SendOtpAsync(user, VerificationCodeType.EmailVerification);
    }

    public async Task VerifyAccountAsync(VerifyAccountDto dto)
    {
        await VerifyOtpInternalAsync(dto.Email, dto.Code, VerificationCodeType.EmailVerification);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        user.IsVerified = true;
        await _context.SaveChangesAsync();
    }

    public async Task ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("لا يوجد حساب مرتبط بهذا البريد الإلكتروني");

        await SendOtpAsync(user, VerificationCodeType.PasswordReset);
    }

    public async Task ResetPasswordAsync(ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        await VerifyOtpInternalAsync(dto.Email, dto.Code, VerificationCodeType.PasswordReset);

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        var oldTokens = await _context.RefreshTokens
            .Where(rt => rt.UserId == user.Id && !rt.IsRevoked)
            .ToListAsync();
        foreach (var token in oldTokens)
            token.IsRevoked = true;

        await _context.SaveChangesAsync();
    }

    private async Task SendOtpAsync(User user, VerificationCodeType type)
    {
        var now = DateTime.UtcNow;

        var recentCodes = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id && v.Type == type && !v.IsUsed)
            .ToListAsync();

        foreach (var oldCode in recentCodes)
            oldCode.IsUsed = true;

        var requestsInLastHour = await _context.VerificationCodes
            .CountAsync(v => v.UserId == user.Id && v.Type == type && v.CreatedAt > now.AddHours(-1));

        if (requestsInLastHour >= 5)
            throw new InvalidOperationException("لقد تجاوزت الحد المسموح من طلبات إرسال الكود، حاول لاحقًا");

        var lastCode = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id && v.Type == type)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        if (lastCode != null && (now - lastCode.CreatedAt).TotalSeconds < 60)
        {
            var remaining = 60 - (int)(now - lastCode.CreatedAt).TotalSeconds;
            throw new InvalidOperationException($"يمكنك طلب كود جديد بعد {remaining} ثانية");
        }

        var code = GenerateNumericCode();
        var codeHash = BCrypt.Net.BCrypt.HashPassword(code);

        _context.VerificationCodes.Add(new VerificationCode
        {
            UserId = user.Id,
            CodeHash = codeHash,
            Type = type,
            ExpiresAt = now.AddMinutes(10),
            IsUsed = false,
            Attempts = 0
        });

        await _context.SaveChangesAsync();

        string subject, body;
        if (type == VerificationCodeType.EmailVerification)
        {
            subject = "تفعيل حسابك في فاتورة راحتك";
            body = $@"
                <div style='font-family:Arial;max-width:480px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px'>
                    <h2 style='color:#1a237e;text-align:center'>فاتورة راحتك</h2>
                    <p style='font-size:16px;color:#333'>مرحبًا {user.FullName}،</p>
                    <p style='font-size:14px;color:#555'>رمز التفعيل الخاص بك هو:</p>
                    <div style='text-align:center;margin:24px 0'>
                        <span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a237e;direction:ltr;display:inline-block'>{code}</span>
                    </div>
                    <p style='font-size:13px;color:#999'>هذا الرمز صالح لمدة 10 دقائق.</p>
                    <hr style='border:none;border-top:1px solid #eee' />
                    <p style='font-size:12px;color:#bbb;text-align:center'>© {now.Year} فاتورة راحتك.</p>
                </div>";
        }
        else
        {
            subject = "استرجاع كلمة المرور - فاتورة راحتك";
            body = $@"
                <div style='font-family:Arial;max-width:480px;margin:auto;padding:20px;border:1px solid #e0e0e0;border-radius:10px'>
                    <h2 style='color:#1a237e;text-align:center'>فاتورة راحتك</h2>
                    <p style='font-size:16px;color:#333'>مرحبًا {user.FullName}،</p>
                    <p style='font-size:14px;color:#555'>رمز استرجاع كلمة المرور الخاص بك هو:</p>
                    <div style='text-align:center;margin:24px 0'>
                        <span style='font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a237e;direction:ltr;display:inline-block'>{code}</span>
                    </div>
                    <p style='font-size:13px;color:#999'>هذا الرمز صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
                    <hr style='border:none;border-top:1px solid #eee' />
                    <p style='font-size:12px;color:#bbb;text-align:center'>© {now.Year} فاتورة راحتك.</p>
                </div>";
        }

        try
        {
            await _emailService.SendEmailAsync(user.Email, subject, body);
        }
        catch (InvalidOperationException ex)
        {
            throw new InvalidOperationException($"حصل خطأ في إرسال البريد الإلكتروني: {ex.Message}");
        }
    }

    private async Task VerifyOtpInternalAsync(string email, string code, VerificationCodeType type)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        var validCode = await _context.VerificationCodes
            .Where(v => v.UserId == user.Id
                && v.Type == type
                && !v.IsUsed
                && v.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();

        if (validCode == null)
            throw new InvalidOperationException("رمز التحقق غير صحيح أو منتهي الصلاحية");

        if (validCode.Attempts >= 5)
        {
            validCode.IsUsed = true;
            await _context.SaveChangesAsync();
            throw new InvalidOperationException("لقد تجاوزت الحد الأقصى من المحاولات، يرجى طلب كود جديد");
        }

        bool codeValid;
        try
        {
            codeValid = BCrypt.Net.BCrypt.Verify(code, validCode.CodeHash);
        }
        catch
        {
            codeValid = false;
        }

        if (!codeValid)
        {
            validCode.Attempts++;
            await _context.SaveChangesAsync();
            throw new InvalidOperationException("رمز التحقق غير صحيح");
        }

        validCode.IsUsed = true;
        await _context.SaveChangesAsync();
    }

    private static string GenerateNumericCode()
    {
        var randomBytes = new byte[4];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var number = BitConverter.ToUInt32(randomBytes, 0) % 1000000;
        return number.ToString("D6");
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

    private static string GenerateRefreshTokenValue()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }
}
