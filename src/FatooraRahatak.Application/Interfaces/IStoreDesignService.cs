using FatooraRahatak.Application.DTOs.Stores;

namespace FatooraRahatak.Application.Interfaces;

public interface IStoreDesignService
{
    Task<List<StoreDesignRequestDto>> GetRequestsAsync();
    Task<StoreDesignRequestDto?> GetRequestAsync(long id);
    Task<List<StoreDesignMessageDto>> GetMessagesAsync(long requestId);
    Task<StoreDesignRequestDto> GetOrCreateForStoreAsync(long storeId);
    Task<List<StoreDesignMessageDto>> GetMessagesForStoreAsync(long storeId);
    Task<StoreDesignMessageDto> SendMessageAsync(long requestId, string senderType, string senderName, SendStoreDesignMessageDto dto);
    Task UpdateStatusAsync(long requestId, string status);
}
