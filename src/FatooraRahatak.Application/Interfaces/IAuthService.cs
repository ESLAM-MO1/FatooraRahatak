using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
    Task<string?> SendVerificationCodeAsync(string email);
    Task VerifyAccountAsync(VerifyAccountDto dto);
    Task<string?> ForgotPasswordAsync(ForgotPasswordDto dto);
    Task ResetPasswordAsync(ResetPasswordDto dto);
    Task<string?> SendProfileUpdateCodeAsync(long userId);
    Task UpdateProfileAsync(long userId, UpdateProfileDto dto);
    Task<string?> SendPasswordChangeCodeAsync(long userId);
    Task ChangePasswordAsync(long userId, ChangePasswordDto dto);
}