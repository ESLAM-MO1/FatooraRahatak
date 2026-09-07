using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Affiliates;

public class ReferralCode : BaseEntity
{
    public long UserId { get; set; }
    public string Code { get; set; } = string.Empty;

    public User User { get; set; } = null!;
    public ICollection<Referral> Referrals { get; set; } = new List<Referral>();
}
