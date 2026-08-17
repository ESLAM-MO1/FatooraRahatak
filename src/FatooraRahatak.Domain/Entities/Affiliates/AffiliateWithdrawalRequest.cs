using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Affiliates;

public class AffiliateWithdrawalRequest : BaseEntity
{
    public long UserId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public AffiliateWithdrawalStatus Status { get; set; } = AffiliateWithdrawalStatus.Pending;
    public DateTime? ProcessedAt { get; set; }
    public string? AdminNote { get; set; }

    public User User { get; set; } = null!;
}

public enum AffiliateWithdrawalStatus
{
    Pending = 1,
    Paid = 2,
    Rejected = 3
}