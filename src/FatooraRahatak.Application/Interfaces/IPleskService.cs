namespace FatooraRahatak.Application.Interfaces;

public interface IPleskService
{
    Task<(bool Success, string Output)> CreateDomainAliasAsync(string domain);
    Task<(bool Success, string Output)> RemoveDomainAliasAsync(string domain);
    Task<(bool Success, string Output)> IssueSslAsync(string domain);
}
