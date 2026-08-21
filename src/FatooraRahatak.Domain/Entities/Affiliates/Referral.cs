using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Affiliates;

public class Referral : BaseEntity
{
    public long ReferrerUserId { get; set; }
    public long ReferredUserId { get; set; }
    public long? ReferralCodeId { get; set; }
    public DateTime ReferredAt { get; set; } = DateTime.UtcNow;
    public bool HasConverted { get; set; } = false;
    public DateTime? ConvertedAt { get; set; }
    public string Status { get; set; } = "Pending"; // Pending / Approved / Rejected
    public DateTime? ReviewedAt { get; set; }
    public long? ReviewedByUserId { get; set; }
    public string? AdminNote { get; set; }

    public User? ReviewedBy { get; set; }

    public User ReferrerUser { get; set; } = null!;
    public User ReferredUser { get; set; } = null!;
    public ReferralCode? ReferralCode { get; set; }
    public ICollection<AffiliateCommission> Commissions { get; set; } = new List<AffiliateCommission>();
}
