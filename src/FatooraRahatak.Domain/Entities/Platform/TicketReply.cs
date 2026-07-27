using FatooraRahatak.Domain.Common;
namespace FatooraRahatak.Domain.Entities.Platform;

public class TicketReply : BaseEntity
{
    public long TicketId { get; set; }
    public ContactMessage Ticket { get; set; } = null!;
    public string ReplyText { get; set; } = string.Empty;
    public string RepliedByName { get; set; } = string.Empty;
    public long? RepliedByUserId { get; set; }
    public bool IsAdminReply { get; set; } = true;
}
