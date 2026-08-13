namespace FatooraRahatak.Application.DTOs.Auth;
public class ChangePasswordDto
{
    public string NewPassword { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
}
