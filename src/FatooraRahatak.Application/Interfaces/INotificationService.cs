using FatooraRahatak.Application.DTOs.Notifications;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.Interfaces;

public interface INotificationService
{
    Task<NotificationListResponseDto> GetMyNotificationsAsync(long userId, int take = 10);
    Task MarkAsReadAsync(long userId, long notificationId);
    Task MarkAllAsReadAsync(long userId);

    // ⚠️ Method جاهزة للاستخدام لاحقًا وقت ربط الأحداث الحقيقية (تاسك منفصل بعد كل المعالم)
    // مش بتتنادى من أي مكان حاليًا غير الـ Seed التجريبي
    Task CreateAsync(long userId, string titleAr, string messageAr, NotificationType type, string? link = null);
}