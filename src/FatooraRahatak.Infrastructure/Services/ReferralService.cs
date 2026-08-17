using FatooraRahatak.Application.DTOs.Referral;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Affiliates;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class ReferralService : IReferralService
{
    private readonly AppDbContext _context;

    public ReferralService(AppDbContext context) { _context = context; }

    public async Task<ReferralOverviewDto> GetMyOverviewAsync(long userId)
    {
        var code = await _context.ReferralCodes.FirstOrDefaultAsync(c => c.UserId == userId);

        if (code == null)
        {
            code = await CreateReferralCodeForUserAsync(userId);
        }

        var referrals = await _context.Referrals
            .Where(r => r.ReferrerUserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new MyReferralDto
            {
                Id = r.Id,
                ReferredUserName = r.ReferredUser.FullName,
                ReferredAt = r.CreatedAt,
                Status = r.HasConverted ? "Converted" : "Registered",
            })
            .ToListAsync();

        var commissions = await _context.AffiliateCommissions
            .Where(c => c.Referral.ReferrerUserId == userId)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new MyCommissionDto
            {
                Id = c.Id,
                Amount = c.Amount,
                Currency = c.Currency,
                Rate = c.Rate,
                Status = c.Status.ToString(),
                CreatedAt = c.CreatedAt,
                PaidAt = c.PaidAt,
            })
            .ToListAsync();

        var user = await _context.Users.FindAsync(userId);

        return new ReferralOverviewDto
        {
            Code = code.Code,
            Balance = user?.AffiliateBalance ?? 0m,
            TotalReferrals = referrals.Count,
            ConvertedReferrals = referrals.Count(r => r.Status == "Converted"),
            TotalCommissions = commissions.Sum(c => c.Amount),
            PendingCommissions = commissions.Where(c => c.Status == "Pending").Sum(c => c.Amount),
            Referrals = referrals,
            Commissions = commissions,
        };
    }

    public async Task<ReferralCode> GetOrCreateReferralCodeAsync(long userId)
    {
        var code = await _context.ReferralCodes.FirstOrDefaultAsync(c => c.UserId == userId);
        if (code != null) return code;
        return await CreateReferralCodeForUserAsync(userId);
    }

    public async Task<bool> RecordReferralAsync(string code, long referredUserId)
    {
        var normalized = code.Trim().ToUpperInvariant();
        var referrer = await _context.ReferralCodes.FirstOrDefaultAsync(c => c.Code == normalized);
        if (referrer == null || referrer.UserId == referredUserId)
            return false;

        var alreadyReferred = await _context.Referrals.AnyAsync(r => r.ReferredUserId == referredUserId);
        if (alreadyReferred)
            return true;

        _context.Referrals.Add(new Referral
        {
            ReferrerUserId = referrer.UserId,
            ReferredUserId = referredUserId,
            ReferralCodeId = referrer.Id,
            ReferredAt = DateTime.UtcNow,
            HasConverted = false,
        });
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<AdminReferralDto>> GetAllReferralsAsync(string? status = null)
    {
        var query = _context.Referrals
            .Include(r => r.ReferrerUser)
            .Include(r => r.ReferredUser)
            .OrderByDescending(r => r.CreatedAt);

        var list = await query.ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("converted", StringComparison.OrdinalIgnoreCase))
                list = list.Where(r => r.HasConverted).ToList();
            else if (status.Equals("registered", StringComparison.OrdinalIgnoreCase))
                list = list.Where(r => !r.HasConverted).ToList();
        }

        return list.Select(r => new AdminReferralDto
        {
            Id = r.Id,
            ReferrerUserId = r.ReferrerUserId,
            ReferrerName = r.ReferrerUser.FullName,
            ReferrerEmail = r.ReferrerUser.Email,
            ReferredUserId = r.ReferredUserId,
            ReferredName = r.ReferredUser.FullName,
            ReferredEmail = r.ReferredUser.Email,
            ReferredAt = r.CreatedAt,
            HasConverted = r.HasConverted,
            ConvertedAt = r.ConvertedAt,
        }).ToList();
    }

    public async Task<List<AdminCommissionDto>> GetAllCommissionsAsync(string? status = null)
    {
        var query = _context.AffiliateCommissions
            .Include(c => c.Referral)
            .ThenInclude(r => r.ReferrerUser)
            .OrderByDescending(c => c.CreatedAt);

        var list = await query.ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("paid", StringComparison.OrdinalIgnoreCase))
                list = list.Where(c => c.Status == AffiliateCommissionStatus.Paid).ToList();
            else if (status.Equals("pending", StringComparison.OrdinalIgnoreCase))
                list = list.Where(c => c.Status == AffiliateCommissionStatus.Pending).ToList();
        }

        return list.Select(c => new AdminCommissionDto
        {
            Id = c.Id,
            ReferralId = c.ReferralId,
            ReferrerUserId = c.Referral.ReferrerUserId,
            ReferrerName = c.Referral.ReferrerUser.FullName,
            ReferrerEmail = c.Referral.ReferrerUser.Email,
            StoreId = c.StoreId,
            SubscriptionId = c.SubscriptionId,
            Amount = c.Amount,
            Currency = c.Currency,
            Rate = c.Rate,
            Status = c.Status.ToString(),
            CreatedAt = c.CreatedAt,
            PaidAt = c.PaidAt,
        }).ToList();
    }

    public async Task MarkCommissionPaidAsync(long commissionId)
    {
        var commission = await _context.AffiliateCommissions
            .Include(c => c.Referral)
            .FirstOrDefaultAsync(c => c.Id == commissionId);
        if (commission == null)
            throw new InvalidOperationException("العمولة غير موجودة");
        if (commission.Status != AffiliateCommissionStatus.Pending)
            throw new InvalidOperationException("هذه العمولة تم صرفها مسبقًا");

        var referrer = await _context.Users.FindAsync(commission.Referral.ReferrerUserId);
        if (referrer == null)
            throw new InvalidOperationException("صاحب العمولة غير موجود");

        commission.Status = AffiliateCommissionStatus.Paid;
        commission.PaidAt = DateTime.UtcNow;
        commission.UpdatedAt = DateTime.UtcNow;

        referrer.AffiliateBalance += commission.Amount;
        referrer.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<int> GetCommissionSummaryAsync()
    {
        return await _context.AffiliateCommissions.CountAsync();
    }

    public async Task<List<MyWithdrawalDto>> GetMyWithdrawalsAsync(long userId)
    {
        return await _context.AffiliateWithdrawalRequests
            .Where(w => w.UserId == userId)
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new MyWithdrawalDto
            {
                Id = w.Id,
                Amount = w.Amount,
                Currency = w.Currency,
                Status = w.Status.ToString(),
                CreatedAt = w.CreatedAt,
                ProcessedAt = w.ProcessedAt,
                AdminNote = w.AdminNote,
            })
            .ToListAsync();
    }

    public async Task<List<AdminWithdrawalDto>> GetAllWithdrawalsAsync(string? status = null)
    {
        var query = _context.AffiliateWithdrawalRequests
            .Include(w => w.User)
            .OrderByDescending(w => w.CreatedAt);

        var list = await query.ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("paid", StringComparison.OrdinalIgnoreCase))
                list = list.Where(w => w.Status == AffiliateWithdrawalStatus.Paid).ToList();
            else if (status.Equals("pending", StringComparison.OrdinalIgnoreCase))
                list = list.Where(w => w.Status == AffiliateWithdrawalStatus.Pending).ToList();
            else if (status.Equals("rejected", StringComparison.OrdinalIgnoreCase))
                list = list.Where(w => w.Status == AffiliateWithdrawalStatus.Rejected).ToList();
        }

        return list.Select(w => new AdminWithdrawalDto
        {
            Id = w.Id,
            UserId = w.UserId,
            UserName = w.User.FullName,
            UserEmail = w.User.Email,
            Amount = w.Amount,
            Currency = w.Currency,
            Status = w.Status.ToString(),
            CreatedAt = w.CreatedAt,
            ProcessedAt = w.ProcessedAt,
            AdminNote = w.AdminNote,
        }).ToList();
    }

    public async Task<MyWithdrawalDto> RequestWithdrawalAsync(long userId, decimal amount)
    {
        if (amount <= 0)
            throw new InvalidOperationException("المبلغ المطلوب سحبه غير صالح");

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        if (amount > user.AffiliateBalance)
            throw new InvalidOperationException("المبلغ المطلوب يتجاوز رصيدك المتاح");

        var hasPending = await _context.AffiliateWithdrawalRequests
            .AnyAsync(w => w.UserId == userId && w.Status == AffiliateWithdrawalStatus.Pending);
        if (hasPending)
            throw new InvalidOperationException("لديك طلب سحب قيد المعالجة بالفعل");

        var withdrawal = new AffiliateWithdrawalRequest
        {
            UserId = userId,
            Amount = amount,
            Currency = "SAR",
            Status = AffiliateWithdrawalStatus.Pending,
        };

        _context.AffiliateWithdrawalRequests.Add(withdrawal);
        await _context.SaveChangesAsync();

        return new MyWithdrawalDto
        {
            Id = withdrawal.Id,
            Amount = withdrawal.Amount,
            Currency = withdrawal.Currency,
            Status = withdrawal.Status.ToString(),
            CreatedAt = withdrawal.CreatedAt,
        };
    }

    public async Task ProcessWithdrawalAsync(long withdrawalId, bool approve, string? note)
    {
        var withdrawal = await _context.AffiliateWithdrawalRequests
            .FirstOrDefaultAsync(w => w.Id == withdrawalId);
        if (withdrawal == null)
            throw new InvalidOperationException("طلب السحب غير موجود");
        if (withdrawal.Status != AffiliateWithdrawalStatus.Pending)
            throw new InvalidOperationException("تمت معالجة هذا الطلب مسبقًا");

        var user = await _context.Users.FindAsync(withdrawal.UserId);
        if (user == null)
            throw new InvalidOperationException("مقدم الطلب غير موجود");

        if (approve)
        {
            if (withdrawal.Amount > user.AffiliateBalance)
                throw new InvalidOperationException("رصيد المستخدم لا يكفي لصرف هذا الطلب");

            user.AffiliateBalance -= withdrawal.Amount;
            withdrawal.Status = AffiliateWithdrawalStatus.Paid;
        }
        else
        {
            withdrawal.Status = AffiliateWithdrawalStatus.Rejected;
        }

        withdrawal.ProcessedAt = DateTime.UtcNow;
        withdrawal.UpdatedAt = DateTime.UtcNow;
        withdrawal.AdminNote = note;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    private async Task<ReferralCode> CreateReferralCodeForUserAsync(long userId)
    {
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            throw new InvalidOperationException("المستخدم غير موجود");

        var code = GenerateLongNumericCode();
        var attempts = 0;
        while (await _context.ReferralCodes.AnyAsync(c => c.Code == code) && attempts < 20)
        {
            code = GenerateLongNumericCode();
            attempts++;
        }

        var referralCode = new ReferralCode { UserId = userId, Code = code };
        _context.ReferralCodes.Add(referralCode);
        await _context.SaveChangesAsync();
        return referralCode;
    }

    public async Task<int> UpgradeLegacyCodesAsync()
    {
        var legacyCodes = await _context.ReferralCodes
            .Where(c => c.Code.Length < 7 || EF.Functions.Like(c.Code, "%[^0-9]%"))
            .ToListAsync();

        foreach (var referralCode in legacyCodes)
        {
            var code = GenerateLongNumericCode();
            var attempts = 0;
            while (await _context.ReferralCodes.AnyAsync(c => c.Code == code) && attempts < 20)
            {
                code = GenerateLongNumericCode();
                attempts++;
            }
            referralCode.Code = code;
        }

        await _context.SaveChangesAsync();
        return legacyCodes.Count;
    }

    private static string GenerateLongNumericCode()
    {
        // 7-8 random numeric digits
        return Random.Shared.Next(1000000, 100000000).ToString();
    }
}
