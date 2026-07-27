namespace FatooraRahatak.Application.DTOs.Admin;

public class CreateStaffDto
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string RoleType { get; set; } = string.Empty; // Support, Finance, Technical
}
