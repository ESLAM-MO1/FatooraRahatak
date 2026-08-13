using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Auth;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.API.Filters;

namespace FatooraRahatak.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly AppDbContext _context;
    private readonly IPermissionCheckService _permCheck;

    public AuthController(IAuthService authService, AppDbContext context, IPermissionCheckService permCheck)
    {
        _authService = authService;
        _context = context;
        _permCheck = permCheck;
    }

    private long GetUserId() =>
        long.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

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
                message = "تم إرسال رمز التفعيل إلى بريدك الإلكتروني",
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
                message = "تم إرسال رمز استرجاع كلمة المرور إلى بريدك الإلكتروني",
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
[HttpPost("google")]
    public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthDto dto)
    {
        try
        {
            var result = await _authService.GoogleAuthAsync(dto);
            return Ok(new { success = true, data = result, message = "تم تسجيل الدخول بنجاح" });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile()
    {
        var userId = GetUserId();
        var user = await _context.Users.FindAsync(userId);
        if (user == null) return NotFound();
        var permissions = await _permCheck.GetUserPermissionCodesAsync(userId);
        var storeId = await _permCheck.GetUserStoreIdAsync(userId);
        return Ok(new { success = true, data = new { user.Id, user.FullName, user.Email, user.Phone, user.ProfileImage, permissions, storeId } });
    }

    [Authorize]
    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        try
        {
            await _authService.UpdateProfileAsync(GetUserId(), dto);
            return Ok(new { success = true, message = "تم تحديث الملف الشخصي بنجاح" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("send-profile-otp")]
    public async Task<IActionResult> SendProfileOtp()
    {
        try
        {
            var code = await _authService.SendProfileUpdateCodeAsync(GetUserId());
            return Ok(new
            {
                success = true,
                message = "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
                code
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("send-password-otp")]
    public async Task<IActionResult> SendPasswordOtp()
    {
        try
        {
            var code = await _authService.SendPasswordChangeCodeAsync(GetUserId());
            return Ok(new
            {
                success = true,
                message = "تم إرسال رمز التحقق إلى بريدك الإلكتروني",
                code
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        try
        {
            await _authService.ChangePasswordAsync(GetUserId(), dto);
            return Ok(new { success = true, message = "تم تغيير كلمة المرور بنجاح، يرجى تسجيل الدخول من جديد" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }
}