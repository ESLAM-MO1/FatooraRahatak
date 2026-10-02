using FatooraRahatak.Application.DTOs.Payment;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Application.Interfaces;

public interface IStorePaymentCredentialService
{
    Task<List<StorePaymentCredentialStatusDto>> GetStatusesAsync(long storeId);
    Task<StorePaymentCredentialStatusDto> SaveAsync(long storeId, SaveStorePaymentCredentialDto dto);
    Task<StorePaymentCredentialSecrets?> GetSecretsAsync(long storeId, PaymentProviderType provider);
    Task<HashSet<PaymentProviderType>> GetEnabledProvidersAsync(long storeId);
}
