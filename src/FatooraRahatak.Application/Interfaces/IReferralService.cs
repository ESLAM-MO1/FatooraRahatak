using FatooraRahatak.Application.DTOs.Referral;
using FatooraRahatak.Domain.Entities.Affiliates;

namespace FatooraRahatak.Application.Interfaces;

public interface IReferralService
{
    Task<ReferralOverviewDto> GetMyOverviewAsync(long userId);
    Task<ReferralCode> GetOrCreateReferralCodeAsync(long userId);
    Task<bool> RecordReferralAsync(string code, long referredUserId);
    Task<List<AdminReferralDto>> GetAllReferralsAsync(string? status = null);
    Task<List<AdminCommissionDto>> GetAllCommissionsAsync(string? status = null);
    Task MarkCommissionPaidAsync(long commissionId);
    Task<int> UpgradeLegacyCodesAsync();
    Task<List<MyWithdrawalDto>> GetMyWithdrawalsAsync(long userId);
    Task<List<AdminWithdrawalDto>> GetAllWithdrawalsAsync(string? status = null);
    Task<MyWithdrawalDto> RequestWithdrawalAsync(long userId, decimal amount);
    Task ProcessWithdrawalAsync(long withdrawalId, bool approve, string? note);
}
