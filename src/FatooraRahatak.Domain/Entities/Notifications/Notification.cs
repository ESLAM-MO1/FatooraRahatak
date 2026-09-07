using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
namespace FatooraRahatak.Domain.Entities.Notifications;

public class Notification
{
    public long Id { get; set; }
    public long UserId { get; set; }
    public User User { get; set; } = null!;

    public string TitleAr { get; set; } = string.Empty;
    public string MessageAr { get; set; } = string.Empty;
    public NotificationType Type { get; set; } = NotificationType.General;

    public bool IsRead { get; set; } = false;
    public string? Link { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}