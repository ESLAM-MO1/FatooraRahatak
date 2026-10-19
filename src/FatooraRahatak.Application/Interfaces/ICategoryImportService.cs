using FatooraRahatak.Application.DTOs.Products;

namespace FatooraRahatak.Application.Interfaces;

public interface ICategoryImportService
{
    Task<CategoryImportResultDto> ImportAsync(long storeId, Stream file);
    byte[] BuildTemplate();
}
