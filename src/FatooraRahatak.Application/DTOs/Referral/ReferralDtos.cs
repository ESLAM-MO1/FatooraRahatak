namespace FatooraRahatak.Application.DTOs.Referral;

public class ReferralOverviewDto
{
    public string Code { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public int TotalReferrals { get; set; }
    public int ConvertedReferrals { get; set; }
    public decimal TotalCommissions { get; set; }
    public decimal PendingCommissions { get; set; }
    public List<MyReferralDto> Referrals { get; set; } = new();
    public List<MyCommissionDto> Commissions { get; set; } = new();
}

public class MyReferralDto
{
    public long Id { get; set; }
    public string ReferredUserName { get; set; } = string.Empty;
    public DateTime ReferredAt { get; set; }
    public string Status { get; set; } = string.Empty;
}

public class MyCommissionDto
{
    public long Id { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal Rate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}

public class AdminReferralDto
{
    public long Id { get; set; }
    public long ReferrerUserId { get; set; }
    public string ReferrerName { get; set; } = string.Empty;
    public string ReferrerEmail { get; set; } = string.Empty;
    public long ReferredUserId { get; set; }
    public string ReferredName { get; set; } = string.Empty;
    public string ReferredEmail { get; set; } = string.Empty;
    public DateTime ReferredAt { get; set; }
    public bool HasConverted { get; set; }
    public DateTime? ConvertedAt { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedByName { get; set; }
    public string? AdminNote { get; set; }
}

public class ReviewReferralDto
{
    public bool Approve { get; set; }
    public string? Note { get; set; }
}

public class UpdateCommissionRateDto
{
    public decimal Rate { get; set; }
}

public class ReferralSettingsDto
{
    public decimal DefaultCommissionRate { get; set; }
}

public class AdminCommissionDto
{
    public long Id { get; set; }
    public long ReferralId { get; set; }
    public long ReferrerUserId { get; set; }
    public string ReferrerName { get; set; } = string.Empty;
    public string ReferrerEmail { get; set; } = string.Empty;
    public long StoreId { get; set; }
    public long SubscriptionId { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal Rate { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? PaidAt { get; set; }
}