using FatooraRahatak.Application.DTOs.Merchant;

namespace FatooraRahatak.Application.Interfaces;

public interface IMerchantAccountService
{
    Task<MerchantAccountDto?> GetByStoreAsync(long storeId);
    Task<MerchantAccountDto> UpsertAsync(long storeId, UpsertMerchantAccountDto dto);
    Task<MerchantAccountDto> UpdateLogoAsync(long storeId, string logoPath);
    Task<MerchantAccountDto> MarkSubmittedAsync(long storeId);

    /// <summary>هل التاجر معتمد فعليًا؟ (حساب التاجر Approved ومستندات التوثيق Approved معًا)</summary>
    Task<bool> IsMerchantKycApprovedAsync(long storeId);

    /// <summary>الحالة الموحدة لاعتماد التاجر (حساب التاجر + مستندات التوثيق).</summary>
    Task<MerchantKycStatusDto> GetMerchantKycStatusAsync(long storeId);

    Task<List<AdminMerchantAccountDto>> GetAllAccountsAsync(string? status = null);
    Task<AdminMerchantAccountDto?> GetAdminAccountAsync(long id);
    Task ProcessAccountReviewAsync(long id, ReviewMerchantAccountDto dto, long adminUserId);
    Task SuspendAccountAsync(long id, string reason, long adminUserId, string? ipAddress = null);
    Task ReactivateAccountAsync(long id, long adminUserId, string? ipAddress = null);
}