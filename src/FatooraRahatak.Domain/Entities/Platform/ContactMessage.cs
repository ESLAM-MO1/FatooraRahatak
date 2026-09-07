using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Users;
namespace FatooraRahatak.Domain.Entities.Platform;

public class ContactMessage : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "ContactUs";
    public string Status { get; set; } = "New";
    public string TicketNumber { get; set; } = string.Empty;
    public long? UserId { get; set; }
    public User? User { get; set; }
    public ICollection<TicketReply> TicketReplies { get; set; } = new List<TicketReply>();
}
