using FatooraRahatak.Domain.Common;
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
}
