using FatooraRahatak.Application.DTOs.Employees;
namespace FatooraRahatak.Application.Interfaces;

public interface IInvitationService
{
    Task<StoreInvitationResponseDto> CreateInvitationAsync(long ownerUserId, CreateInvitationDto dto);
    Task<List<StoreInvitationResponseDto>> GetInvitationsAsync(long ownerUserId);
    Task AcceptInvitationAsync(string token, long userId);
}
