using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface IProductImportService
{
    Task<ProductImportResultDto> ImportAsync(long storeId, long userId, Stream file);
    byte[] BuildTemplate();
}
