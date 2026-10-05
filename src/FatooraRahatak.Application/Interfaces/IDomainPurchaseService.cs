using FatooraRahatak.Application.DTOs.Stores;

namespace FatooraRahatak.Application.Interfaces;

public interface IDomainPurchaseService
{
    Task<DomainPurchaseRequestDto?> GetMyLatestAsync(long userId);
    Task<DomainPurchaseRequestDto> CreateAsync(long userId, CreateDomainPurchaseRequestDto dto);
    Task<List<DomainPurchaseRequestDto>> GetAllAsync(string? status);
    Task<DomainPurchaseRequestDto> CompleteAsync(long id, long adminUserId, CompleteDomainPurchaseRequestDto dto);
    Task<DomainPurchaseRequestDto> RejectAsync(long id, long adminUserId, RejectDomainPurchaseRequestDto dto);
}
