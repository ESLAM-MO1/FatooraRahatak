using Microsoft.AspNetCore.Mvc;
using FatooraRahatak.Application.DTOs.Auth;
using FatooraRahatak.Application.Interfaces;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(new { success = true, data = result, message = "تم إنشاء الحساب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var result = await _authService.LoginAsync(dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الدخول بنجاح" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] string refreshToken)
    {
        try
        {
            var result = await _authService.RefreshTokenAsync(refreshToken);
            return Ok(new { success = true, data = result, message = "تم تجديد الجلسة" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("send-verification-code")]
    public async Task<IActionResult> SendVerificationCode([FromQuery] string email)
    {
        try
        {
            var code = await _authService.SendVerificationCodeAsync(email);
            return Ok(new
            {
                success = true,
                message = "تم إرسال رمز التفعيل",
                devNote = "مؤقتًا (قبل تفعيل SMTP في معلم 4): الرمز ظاهر هنا للاختبار",
                code
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("verify-account")]
    public async Task<IActionResult> VerifyAccount([FromBody] VerifyAccountDto dto)
    {
        try
        {
            await _authService.VerifyAccountAsync(dto);
            return Ok(new { success = true, message = "تم تفعيل الحساب بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto)
    {
        try
        {
            var code = await _authService.ForgotPasswordAsync(dto);
            return Ok(new
            {
                success = true,
                message = "تم إرسال رمز استرجاع كلمة المرور",
                devNote = "مؤقتًا (قبل تفعيل SMTP في معلم 4): الرمز ظاهر هنا للاختبار",
                code
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        try
        {
            await _authService.ResetPasswordAsync(dto);
            return Ok(new { success = true, message = "تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول من جديد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}