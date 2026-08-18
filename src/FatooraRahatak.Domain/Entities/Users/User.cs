using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Employees;

namespace FatooraRahatak.Domain.Entities.Users;

public class User : BaseEntity
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? PasswordHash { get; set; }
    public string? GoogleId { get; set; }
    public UserType UserType { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsVerified { get; set; } = false;
    public string? ProfileImage { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public decimal AffiliateBalance { get; set; } = 0m;

    public Store? OwnedStore { get; set; }
    public Employee? EmployeeProfile { get; set; }

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<VerificationCode> VerificationCodes { get; set; } = new List<VerificationCode>();
}