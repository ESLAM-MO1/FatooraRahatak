using FatooraRahatak.Application.DTOs.Public;

namespace FatooraRahatak.Application.Interfaces;

public interface IQuickLoginService
{
    Task<QuickLoginSendResultDto> SendOtpAsync(string slug, string phone);
    Task<QuickLoginCustomerDto?> VerifyOtpAsync(string slug, string phone, string code);
    Task<QuickLoginCustomerDto?> GetCustomerByPhoneAsync(string slug, string phone);
}
