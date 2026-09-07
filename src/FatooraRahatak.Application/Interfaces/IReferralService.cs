using FatooraRahatak.Application.DTOs.Referral;
using FatooraRahatak.Domain.Entities.Affiliates;

namespace FatooraRahatak.Application.Interfaces;

public interface IReferralService
{
    Task<ReferralOverviewDto> GetMyOverviewAsync(long userId);
    Task<ReferralCode> GetOrCreateReferralCodeAsync(long userId);
    Task<bool> RecordReferralAsync(string code, long referredUserId);
    Task<List<AdminReferralDto>> GetAllReferralsAsync(string? status = null, DateTime? from = null, DateTime? to = null, string? search = null);
    Task<List<AdminCommissionDto>> GetAllCommissionsAsync(string? status = null);
    Task ReviewReferralAsync(long referralId, bool approve, string? note, long adminUserId);
    Task UpdateCommissionRateAsync(long commissionId, decimal rate);
    Task<ReferralSettingsDto> GetReferralSettingsAsync();
    Task UpdateReferralSettingsAsync(decimal defaultCommissionRate);
    Task<int> UpgradeLegacyCodesAsync();
}