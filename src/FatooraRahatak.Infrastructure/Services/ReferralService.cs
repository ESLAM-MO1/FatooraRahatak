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

    public async Task<List<AdminReferralDto>> GetAllReferralsAsync(string? status = null, DateTime? from = null, DateTime? to = null, string? search = null)
    {
        var query = _context.Referrals
            .Include(r => r.ReferrerUser)
            .Include(r => r.ReferredUser)
            .Include(r => r.ReviewedBy)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (status.Equals("converted", StringComparison.OrdinalIgnoreCase) ||
                status.Equals("approved", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.HasConverted || r.Status == "Approved");
            else if (status.Equals("registered", StringComparison.OrdinalIgnoreCase) ||
                     status.Equals("pending", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => !r.HasConverted && r.Status == "Pending");
            else if (status.Equals("rejected", StringComparison.OrdinalIgnoreCase))
                query = query.Where(r => r.Status == "Rejected");
        }

        if (from.HasValue)
            query = query.Where(r => r.ReferredAt >= from.Value);
        if (to.HasValue)
            query = query.Where(r => r.ReferredAt <= to.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            query = query.Where(r =>
                r.ReferrerUser.FullName.Contains(s) || r.ReferrerUser.Email.Contains(s) ||
                r.ReferredUser.FullName.Contains(s) || r.ReferredUser.Email.Contains(s));
        }

        var list = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

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
            Status = r.Status,
            ReviewedAt = r.ReviewedAt,
            ReviewedByName = r.ReviewedBy?.FullName,
            AdminNote = r.AdminNote,
        }).ToList();
    }

    public async Task ReviewReferralAsync(long referralId, bool approve, string? note, long adminUserId)
    {
        var referral = await _context.Referrals
            .Include(r => r.Commissions)
            .FirstOrDefaultAsync(r => r.Id == referralId);
        if (referral == null)
            throw new InvalidOperationException("الإحالة غير موجودة");

        if (referral.Status != "Pending")
            throw new InvalidOperationException("تمت مراجعة هذه الإحالة مسبقًا");

        var pendingCommissions = referral.Commissions
            .Where(c => c.Status == AffiliateCommissionStatus.Pending)
            .ToList();

        if (approve)
        {
            referral.Status = "Approved";
            referral.HasConverted = true;
            referral.ConvertedAt ??= DateTime.UtcNow;

            // اعتماد العمولات المعلّقة المرتبطة بالإحالة وإضافتها فعليًا لرصيد صاحب الإحالة
            if (pendingCommissions.Count > 0)
            {
                var referrer = await _context.Users.FindAsync(referral.ReferrerUserId);
                if (referrer == null)
                    throw new InvalidOperationException("صاحب الإحالة غير موجود");

                foreach (var commission in pendingCommissions)
                {
                    commission.Status = AffiliateCommissionStatus.Paid;
                    commission.PaidAt = DateTime.UtcNow;
                    commission.UpdatedAt = DateTime.UtcNow;
                    referrer.AffiliateBalance += commission.Amount;
                }
                referrer.UpdatedAt = DateTime.UtcNow;
            }
        }
        else
        {
            referral.Status = "Rejected";

            // رفض الإحالة يرفض معه أي عمولة معلّقة مرتبطة بها بدون إضافة أي رصيد
            foreach (var commission in pendingCommissions)
            {
                commission.Status = AffiliateCommissionStatus.Rejected;
                commission.UpdatedAt = DateTime.UtcNow;
            }
        }

        referral.ReviewedAt = DateTime.UtcNow;
        referral.ReviewedByUserId = adminUserId;
        referral.AdminNote = note;
        referral.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task UpdateCommissionRateAsync(long commissionId, decimal rate)
    {
        if (rate < 0 || rate > 100)
            throw new InvalidOperationException("نسبة العمولة يجب أن تكون بين 0 و 100");

        var commission = await _context.AffiliateCommissions.FirstOrDefaultAsync(c => c.Id == commissionId);
        if (commission == null)
            throw new InvalidOperationException("العمولة غير موجودة");
        if (commission.Status != AffiliateCommissionStatus.Pending)
            throw new InvalidOperationException("لا يمكن تعديل عمولة تمت مراجعتها بالفعل (معتمدة أو مرفوضة)");

        if (commission.Rate > 0)
            commission.Amount = Math.Round(commission.Amount * (rate / commission.Rate), 2);

        commission.Rate = rate;
        commission.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    public async Task<ReferralSettingsDto> GetReferralSettingsAsync()
    {
        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "Referral_DefaultCommissionRate");
        return new ReferralSettingsDto
        {
            DefaultCommissionRate = setting != null && decimal.TryParse(setting.SettingValue, out var rate) ? rate : 0m
        };
    }

    public async Task UpdateReferralSettingsAsync(decimal defaultCommissionRate)
    {
        if (defaultCommissionRate < 0 || defaultCommissionRate > 100)
            throw new InvalidOperationException("نسبة العمولة يجب أن تكون بين 0 و 100");

        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "Referral_DefaultCommissionRate");

        if (setting == null)
        {
            _context.PlatformSettings.Add(new FatooraRahatak.Domain.Entities.Platform.PlatformSetting
            {
                SettingKey = "Referral_DefaultCommissionRate",
                SettingValue = defaultCommissionRate.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture),
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            setting.SettingValue = defaultCommissionRate.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
            setting.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
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
            else if (status.Equals("rejected", StringComparison.OrdinalIgnoreCase))
                list = list.Where(c => c.Status == AffiliateCommissionStatus.Rejected).ToList();
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

    public async Task<int> GetCommissionSummaryAsync()
    {
        return await _context.AffiliateCommissions.CountAsync();
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