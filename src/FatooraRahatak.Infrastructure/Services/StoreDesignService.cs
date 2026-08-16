using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class StoreDesignService : IStoreDesignService
{
    private readonly AppDbContext _context;
    public StoreDesignService(AppDbContext context) { _context = context; }

    public async Task<List<StoreDesignRequestDto>> GetRequestsAsync()
    {
        return await _context.Set<StoreDesignRequest>()
            .OrderByDescending(r => r.LastMessageAt ?? r.CreatedAt)
            .Select(r => new StoreDesignRequestDto
            {
                Id = r.Id,
                StoreId = r.StoreId,
                StoreName = r.Store != null ? r.Store.StoreName : "",
                Status = r.Status,
                AppliedCss = r.AppliedCss,
                LastMessageAt = r.LastMessageAt,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<StoreDesignRequestDto?> GetRequestAsync(long id)
    {
        return await _context.Set<StoreDesignRequest>()
            .Where(r => r.Id == id)
            .Select(r => new StoreDesignRequestDto
            {
                Id = r.Id,
                StoreId = r.StoreId,
                StoreName = r.Store != null ? r.Store.StoreName : "",
                Status = r.Status,
                AppliedCss = r.AppliedCss,
                LastMessageAt = r.LastMessageAt,
                CreatedAt = r.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<List<StoreDesignMessageDto>> GetMessagesAsync(long requestId)
    {
        return await _context.Set<StoreDesignMessage>()
            .Where(m => m.RequestId == requestId)
            .OrderBy(m => m.CreatedAt).ThenBy(m => m.Id)
            .Select(m => new StoreDesignMessageDto
            {
                Id = m.Id,
                SenderType = m.SenderType,
                SenderName = m.SenderName,
                Body = m.Body,
                CssPayload = m.CssPayload,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<StoreDesignRequestDto> GetOrCreateForStoreAsync(long storeId)
    {
        var request = await _context.Set<StoreDesignRequest>()
            .Where(r => r.StoreId == storeId)
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync();

        if (request == null)
        {
            request = new StoreDesignRequest { StoreId = storeId };
            _context.Set<StoreDesignRequest>().Add(request);
            await _context.SaveChangesAsync();
        }

        var storeName = await _context.Set<Domain.Entities.Stores.Store>()
            .Where(s => s.Id == storeId).Select(s => s.StoreName).FirstOrDefaultAsync() ?? "";

        return new StoreDesignRequestDto
        {
            Id = request.Id,
            StoreId = request.StoreId,
            StoreName = storeName,
            Status = request.Status,
            AppliedCss = request.AppliedCss,
            LastMessageAt = request.LastMessageAt,
            CreatedAt = request.CreatedAt
        };
    }

    public async Task<List<StoreDesignMessageDto>> GetMessagesForStoreAsync(long storeId)
    {
        var request = await _context.Set<StoreDesignRequest>()
            .Where(r => r.StoreId == storeId)
            .OrderByDescending(r => r.Id)
            .FirstOrDefaultAsync();
        if (request == null) return new List<StoreDesignMessageDto>();
        return await GetMessagesAsync(request.Id);
    }

    public async Task<StoreDesignMessageDto> SendMessageAsync(long requestId, string senderType, string senderName, SendStoreDesignMessageDto dto)
    {
        var request = await _context.Set<StoreDesignRequest>().FindAsync(requestId)
            ?? throw new InvalidOperationException("المحادثة غير موجودة");

        var message = new StoreDesignMessage
        {
            RequestId = requestId,
            SenderType = senderType,
            SenderName = senderName,
            Body = dto.Body,
            CssPayload = dto.CssPayload
        };
        _context.Set<StoreDesignMessage>().Add(message);
        request.LastMessageAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        if (senderType == "Admin" && !string.IsNullOrWhiteSpace(dto.CssPayload))
        {
            await ApplyCssToStoreAsync(requestId, dto.CssPayload);
        }

        return new StoreDesignMessageDto
        {
            Id = message.Id,
            SenderType = message.SenderType,
            SenderName = message.SenderName,
            Body = message.Body,
            CssPayload = message.CssPayload,
            CreatedAt = message.CreatedAt
        };
    }

    public async Task ApplyCssToStoreAsync(long requestId, string? css)
    {
        var request = await _context.Set<StoreDesignRequest>().FindAsync(requestId)
            ?? throw new InvalidOperationException("المحادثة غير موجودة");
        var store = await _context.Set<Domain.Entities.Stores.Store>().FindAsync(request.StoreId);
        if (store != null)
        {
            store.CustomCss = string.IsNullOrWhiteSpace(css) ? null : css;
        }
        request.AppliedCss = string.IsNullOrWhiteSpace(css) ? null : css;
        await _context.SaveChangesAsync();
    }

    public async Task UpdateStatusAsync(long requestId, string status)
    {
        var request = await _context.Set<StoreDesignRequest>().FindAsync(requestId)
            ?? throw new InvalidOperationException("المحادثة غير موجودة");
        request.Status = status;
        await _context.SaveChangesAsync();
    }
}
