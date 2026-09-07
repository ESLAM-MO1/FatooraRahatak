using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Notifications;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Notifications;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly AppDbContext _context;

    public NotificationService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<NotificationListResponseDto> GetMyNotificationsAsync(long userId, int take = 10)
    {
        var query = _context.Notifications.Where(n => n.UserId == userId);

        var unreadCount = await query.CountAsync(n => !n.IsRead);

        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Take(take)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                TitleAr = n.TitleAr,
                MessageAr = n.MessageAr,
                Type = n.Type.ToString(),
                IsRead = n.IsRead,
                Link = n.Link,
                CreatedAt = n.CreatedAt
            })
            .ToListAsync();

        return new NotificationListResponseDto
        {
            Notifications = items,
            UnreadCount = unreadCount
        };
    }

    public async Task MarkAsReadAsync(long userId, long notificationId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId);

        if (notification == null)
            throw new InvalidOperationException("الإشعار غير موجود");

        notification.IsRead = true;
        await _context.SaveChangesAsync();
    }

    public async Task MarkAllAsReadAsync(long userId)
    {
        var unread = await _context.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var n in unread)
            n.IsRead = true;

        await _context.SaveChangesAsync();
    }

    public async Task CreateAsync(long userId, string titleAr, string messageAr, NotificationType type, string? link = null)
    {
        _context.Notifications.Add(new Notification
        {
            UserId = userId,
            TitleAr = titleAr,
            MessageAr = messageAr,
            Type = type,
            Link = link
        });

        await _context.SaveChangesAsync();
    }
}