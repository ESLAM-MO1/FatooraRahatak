using FatooraRahatak.Application.DTOs.Settlement;

namespace FatooraRahatak.Application.Interfaces;

public interface ISettlementService
{
    Task<MerchantBankDetailsDto> SaveMerchantBankDetailsAsync(long storeId, SaveMerchantBankDetailsDto dto);
    Task<MerchantBankDetailsDto?> GetMerchantBankDetailsAsync(long storeId);

    Task<SettlementBatchDto> GenerateSettlementBatchAsync(DateTime? periodEnd = null);
    Task<List<SettlementBatchDto>> GetSettlementBatchesAsync(string? status = null);
    Task<SettlementBatchDetailDto?> GetSettlementBatchDetailAsync(long batchId);
    Task<MerchantSettlementSummaryDto> GetMerchantSettlementSummaryAsync(long storeId);
    Task<SettlementBatchDetailDto?> ConfirmSettlementAsync(long batchId, long adminUserId, string? paymentReference);
}
