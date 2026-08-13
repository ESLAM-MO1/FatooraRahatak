using FatooraRahatak.Application.DTOs.Reports;

namespace FatooraRahatak.Application.Interfaces;

public interface IReportService
{
    Task<SalesReportDto> GetSalesReportAsync(long userId, DateOnly? from, DateOnly? to);
    Task<DiscountReportDto> GetDiscountsReportAsync(long userId, DateOnly? from, DateOnly? to);
    Task<TaxReportDto> GetTaxReportAsync(long userId, DateOnly? from, DateOnly? to);
    Task<List<LowStockRowDto>> GetLowStockAsync(long userId, int? threshold);
    Task<List<InventoryMovementRowDto>> GetInventoryMovementsAsync(long userId, DateOnly? from, DateOnly? to, long? productId);
    Task<InventoryValuationDto> GetInventoryValuationAsync(long userId);
    Task<CustomerStatementDto> GetCustomerStatementAsync(long userId, long? customerId, string? phone, DateOnly? from, DateOnly? to);
    Task<ARAgingDto> GetARAgingAsync(long userId);

    Task<byte[]> ExportSalesReportCsvAsync(long userId, DateOnly? from, DateOnly? to);
    Task<byte[]> ExportDiscountsReportCsvAsync(long userId, DateOnly? from, DateOnly? to);
    Task<byte[]> ExportTaxReportCsvAsync(long userId, DateOnly? from, DateOnly? to);
    Task<byte[]> ExportLowStockCsvAsync(long userId, int? threshold);
    Task<byte[]> ExportInventoryMovementsCsvAsync(long userId, DateOnly? from, DateOnly? to, long? productId);
    Task<byte[]> ExportInventoryValuationCsvAsync(long userId);
    Task<byte[]> ExportCustomerStatementCsvAsync(long userId, long? customerId, string? phone, DateOnly? from, DateOnly? to);
    Task<byte[]> ExportARAgingCsvAsync(long userId);
}
