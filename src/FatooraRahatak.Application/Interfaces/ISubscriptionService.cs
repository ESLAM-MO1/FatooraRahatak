using FatooraRahatak.Application.DTOs.Subscriptions;

namespace FatooraRahatak.Application.Interfaces;

public interface ISubscriptionService
{
    Task<SubscriptionStatusDto> GetStatusAsync(long storeId);
    Task UpgradeAsync(long storeId, ChangePackageDto dto);
    Task DowngradeAsync(long storeId, ChangePackageDto dto);
    Task RenewAsync(long storeId);
    Task CancelAsync(long storeId);
}