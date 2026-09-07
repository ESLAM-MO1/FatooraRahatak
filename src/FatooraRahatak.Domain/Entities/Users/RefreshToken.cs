using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Users;

public class RefreshToken : BaseEntity
{
    public long UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; } = false;

    public User User { get; set; } = null!;
}