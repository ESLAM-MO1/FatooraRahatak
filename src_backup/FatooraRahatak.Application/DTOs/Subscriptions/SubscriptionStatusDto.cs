namespace FatooraRahatak.Application.DTOs.Subscriptions;

public class SubscriptionStatusDto
{
    public string CurrentPackage { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime BillingCycleDate { get; set; }
    public DateTime? GracePeriodEnd { get; set; }
    public int CurrentProductsCount { get; set; }
    public int? MaxProducts { get; set; }
    public int CurrentEmployeesCount { get; set; }
    public int MaxEmployees { get; set; }
    public int CurrentWarehousesCount { get; set; }
    public int MaxWarehouses { get; set; }
}