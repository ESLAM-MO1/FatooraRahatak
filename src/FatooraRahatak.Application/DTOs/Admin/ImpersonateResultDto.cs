namespace FatooraRahatak.Application.DTOs.Admin;

public class ImpersonateResultDto
{
    public string AccessToken { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public long UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string UserType { get; set; } = string.Empty;
}
