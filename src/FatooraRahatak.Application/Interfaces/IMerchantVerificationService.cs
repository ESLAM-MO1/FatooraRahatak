using FatooraRahatak.Application.DTOs.Settlement;

namespace FatooraRahatak.Application.Interfaces;

public interface IMerchantVerificationService
{
    Task<MerchantVerificationDto> GetMyVerificationAsync(long storeId);
    Task<MerchantVerificationDto> SubmitDocumentsAsync(long storeId, long userId, Stream fileStream, string fileName, string documentType);
    Task<MerchantVerificationDto> RemoveDocumentAsync(long storeId, long documentId);
    Task<MerchantVerificationDto> SubmitForReviewAsync(long storeId);
    Task<List<AdminVerificationDto>> GetAllVerificationsAsync(string? status = null);
    Task<AdminVerificationDto?> GetAdminVerificationAsync(long id);
    Task ProcessVerificationAsync(long id, ReviewVerificationDto dto, long adminUserId);
}