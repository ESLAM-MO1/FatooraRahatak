using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class StoreDesignService : IStoreDesignService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    public StoreDesignService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

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

        await NotifyNewMessageAsync(request, senderType, senderName, dto.Body);

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

    private async Task NotifyNewMessageAsync(StoreDesignRequest request, string senderType, string senderName, string body)
    {
        var preview = string.IsNullOrWhiteSpace(body) ? string.Empty : (body.Length > 80 ? body[..80] + "…" : body);
        try
        {
            if (senderType == "StoreOwner")
            {
                var adminIds = await _context.Set<User>()
                    .Where(u => u.UserType == UserType.SuperAdmin && u.IsActive)
                    .Select(u => u.Id)
                    .ToListAsync();
                foreach (var adminId in adminIds)
                {
                    await _notificationService.CreateAsync(
                        adminId,
                        "رسالة جديدة في التصميم المخصص",
                        string.IsNullOrEmpty(preview) ? "أرسل صاحب المتجر رسالة في محادثة التصميم" : $"أرسل {senderName} رسالة: \"{preview}\"",
                        NotificationType.DesignRequestNew,
                        "/dashboard/design-requests");
                }
            }
            else if (senderType == "Admin")
            {
                var ownerUserId = await _context.Set<Domain.Entities.Stores.Store>()
                    .Where(s => s.Id == request.StoreId)
                    .Select(s => s.OwnerUserId)
                    .FirstOrDefaultAsync();
                if (ownerUserId != 0)
                {
                    await _notificationService.CreateAsync(
                        ownerUserId,
                        "رد جديد من فريق التصميم",
                        string.IsNullOrEmpty(preview) ? "رد فريق التصميم على محادثتك" : $"رد فريق التصميم: \"{preview}\"",
                        NotificationType.DesignRequestNew,
                        "/dashboard/store-settings?tab=designChat");
                }
            }
        }
        catch
        {
            // الإشعار إضافي، فشله لا يمنع إرسال الرسالة
        }
    }

    public async Task UpdateStatusAsync(long requestId, string status)
    {
        var request = await _context.Set<StoreDesignRequest>().FindAsync(requestId)
            ?? throw new InvalidOperationException("المحادثة غير موجودة");
        request.Status = status;
        await _context.SaveChangesAsync();
    }
}
