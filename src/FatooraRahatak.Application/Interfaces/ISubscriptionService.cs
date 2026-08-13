using FatooraRahatak.Application.DTOs.Subscriptions;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.Interfaces;

public interface ISubscriptionService
{
    Task<SubscriptionStatusDto> GetStatusAsync(long storeId);
    Task<SubscriptionChangeResultDto> UpgradeAsync(long storeId, ChangePackageDto dto);
    Task<SubscriptionChangeResultDto> DowngradeAsync(long storeId, ChangePackageDto dto);
    Task<SubscriptionChangeResultDto> RenewAsync(long storeId, BillingCycle billingCycle = BillingCycle.Monthly);
    Task CancelAsync(long storeId);
    Task ActivateSubscriptionOnPaymentAsync(long subscriptionId);
}