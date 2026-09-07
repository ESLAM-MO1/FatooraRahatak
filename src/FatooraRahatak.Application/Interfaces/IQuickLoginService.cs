using FatooraRahatak.Application.DTOs.Public;

namespace FatooraRahatak.Application.Interfaces;

public interface IQuickLoginService
{
    Task<QuickLoginSendResultDto> SendOtpAsync(string slug, string email);
    Task<QuickLoginCustomerDto?> VerifyOtpAsync(string slug, string email, string code);
    Task<QuickLoginCustomerDto?> GetCustomerByEmailAsync(string slug, string email);
    Task<QuickLoginCustomerDto?> GetCustomerByPhoneAsync(string slug, string phone);
}