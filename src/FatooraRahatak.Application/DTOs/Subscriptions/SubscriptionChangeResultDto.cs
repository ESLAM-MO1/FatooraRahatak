namespace FatooraRahatak.Application.DTOs.Subscriptions;

public class SubscriptionChangeResultDto
{
    public long SubscriptionId { get; set; }
    public decimal DueAmount { get; set; }
    public decimal BalanceUsed { get; set; }
    public string PaymentStatus { get; set; } = "Pending";
    public bool RequiresPayment { get; set; }
    public string CurrentPackage { get; set; } = string.Empty;
    public string NewPackage { get; set; } = string.Empty;
}
