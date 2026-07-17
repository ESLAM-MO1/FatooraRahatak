namespace FatooraRahatak.Application.DTOs.Notifications;

public class NotificationDto
{
    public long Id { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string MessageAr { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public string? Link { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class NotificationListResponseDto
{
    public List<NotificationDto> Notifications { get; set; } = new();
    public int UnreadCount { get; set; }
}