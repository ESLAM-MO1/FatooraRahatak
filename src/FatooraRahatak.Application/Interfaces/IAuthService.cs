using FatooraRahatak.Application.DTOs.Auth;

namespace FatooraRahatak.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
    Task<AuthResponseDto> GoogleAuthAsync(GoogleAuthDto dto);
    Task<AuthResponseDto> RefreshTokenAsync(string refreshToken);
    Task SendVerificationCodeAsync(string email);
    Task VerifyAccountAsync(VerifyAccountDto dto);
    Task ForgotPasswordAsync(ForgotPasswordDto dto);
    Task ResetPasswordAsync(ResetPasswordDto dto);
}