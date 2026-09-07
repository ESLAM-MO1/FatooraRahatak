using FatooraRahatak.Domain.Entities.Stores;
namespace FatooraRahatak.Domain.Entities.Employees;

public class StoreInvitation
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string InvitedByName { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public long RoleId { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddDays(7);

    public Store Store { get; set; } = null!;
}
