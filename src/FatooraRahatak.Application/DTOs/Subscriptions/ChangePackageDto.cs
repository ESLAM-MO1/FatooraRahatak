using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.DTOs.Subscriptions;

public class ChangePackageDto
{
    public string PackageName { get; set; } = string.Empty;
    public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
}
