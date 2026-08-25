using FatooraRahatak.Application.DTOs.Zatca;

namespace FatooraRahatak.Application.Interfaces;

public interface IZatcaService
{
    Task<ZatcaCredentialDto> GetCredentialAsync(long storeId);
    Task<ZatcaCredentialDto> OnboardAsync(long storeId, long userId, ZatcaOnboardDto dto);
    Task<ZatcaSubmitResultDto> SubmitInvoiceAsync(long storeId, long userId, long invoiceId, bool forceReporting = false, string? buyerVatNumber = null);
    Task<ZatcaInvoiceStatusDto?> GetInvoiceStatusAsync(long storeId, long invoiceId);
    Task<ZatcaSubmitResultDto> VerifyInvoiceAsync(long storeId, long invoiceId);
    Task<ZatcaStatusDto> GetStatusAsync();
}
