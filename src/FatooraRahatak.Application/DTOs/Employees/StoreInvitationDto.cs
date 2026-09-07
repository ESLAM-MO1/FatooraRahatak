namespace FatooraRahatak.Application.DTOs.Employees;

public class CreateInvitationDto
{
    public string Email { get; set; } = string.Empty;
    public long RoleId { get; set; }
    public decimal Salary { get; set; }
}

public class StoreInvitationResponseDto
{
    public long Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}
