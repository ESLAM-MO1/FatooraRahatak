using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Users;

public class VerificationCode : BaseEntity
{
    public long UserId { get; set; }
    public string Code { get; set; } = string.Empty;
    public VerificationCodeType Type { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;

    public User User { get; set; } = null!;
}