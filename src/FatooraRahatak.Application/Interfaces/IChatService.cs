using FatooraRahatak.Application.DTOs.Chat;

namespace FatooraRahatak.Application.Interfaces;

public interface IChatService
{
    Task<ChatResponseDto> AskAsync(long userId, ChatRequestDto dto);
}
