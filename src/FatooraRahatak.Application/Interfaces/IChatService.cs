using FatooraRahatak.Application.DTOs.Chat;

namespace FatooraRahatak.Application.Interfaces;

public interface IChatService
{
    Task<ChatResponseDto> AskAsync(long userId, ChatRequestDto dto);

    /// <summary>
    /// أسئلة الزوار غير المسجّلين من الصفحة الخارجية. رد معلوماتي عن المنصة
    /// فقط — بلا أي وصول لبيانات متاجر وبلا أي أدوات تنفيذ.
    /// </summary>
    Task<ChatResponseDto> AskPublicAsync(ChatRequestDto dto);
}
