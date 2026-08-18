using FatooraRahatak.Application.DTOs.Merchant;

namespace FatooraRahatak.Application.Interfaces;

public interface IMerchantAccountService
{
    Task<MerchantAccountDto?> GetByStoreAsync(long storeId);
    Task<MerchantAccountDto> UpsertAsync(long storeId, UpsertMerchantAccountDto dto);
    Task<MerchantAccountDto> UpdateLogoAsync(long storeId, string logoPath);
    Task<MerchantAccountDto> MarkSubmittedAsync(long storeId);

    Task<List<AdminMerchantAccountDto>> GetAllAccountsAsync(string? status = null);
    Task<AdminMerchantAccountDto?> GetAdminAccountAsync(long id);
    Task ProcessAccountReviewAsync(long id, ReviewMerchantAccountDto dto, long adminUserId);
}