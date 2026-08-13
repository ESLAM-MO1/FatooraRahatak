using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Shipping;

namespace FatooraRahatak.Application.Interfaces;

public interface IShippingService
{
    Task<List<ShippingCompanyDto>> GetCompaniesAsync(long storeId);
    Task<ShippingCompanyDto> CreateCompanyAsync(long storeId, CreateShippingCompanyDto dto);
    Task<ShippingCompanyDto> UpdateCompanyAsync(long storeId, long companyId, UpdateShippingCompanyDto dto);
    Task DeleteCompanyAsync(long storeId, long companyId);
    Task<ShippingQuoteDto> GetQuoteAsync(long storeId, ShippingQuoteRequestDto dto);
    Task<ShipmentDto> CreateShipmentAsync(long storeId, CreateShipmentDto dto);
    Task<PagedResult<ShipmentListDto>> GetShipmentsAsync(long storeId, string? status = null, int page = 1, int pageSize = 20);
    Task<ShipmentDto?> GetShipmentAsync(long storeId, long shipmentId);
    Task<ShipmentDto?> GetShipmentByOrderAsync(long storeId, long orderId);
    Task<SyncShipmentResultDto> SyncShipmentAsync(long storeId, long shipmentId);
    Task<ShipmentDto?> UpdateShipmentStatusAsync(long storeId, long shipmentId, UpdateShipmentStatusDto dto);
}
