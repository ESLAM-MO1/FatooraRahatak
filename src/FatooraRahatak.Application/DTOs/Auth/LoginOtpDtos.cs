namespace FatooraRahatak.Application.DTOs.Auth;

public class LoginVerifyDto
{
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}

public class LoginResendDto
{
    public string Email { get; set; } = string.Empty;
}
