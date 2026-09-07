using FatooraRahatak.Application.DTOs.Search;

namespace FatooraRahatak.Application.Interfaces;

public interface ISearchService
{
    Task<SearchResponseDto> SearchAsync(long storeId, string query);
}