using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface ISiteService
{
    // Landing Page
    Task<LandingPageContentDto> GetLandingPageAsync();
    Task UpdateLandingPageAsync(LandingPageContentDto dto);

    // Packages
    Task<List<PublicPackageDto>> GetAllActivePackagesAsync();

    // Pages
    Task<SitePageDto?> GetPageByKeyAsync(string pageKey);
    Task UpdatePageAsync(long userId, string pageKey, UpdateSitePageDto dto);

    // FAQ
    Task<List<SiteFaqItemDto>> GetPublishedFaqAsync();
    Task<List<SiteFaqItemDto>> GetAllFaqAsync();
    Task<SiteFaqItemDto> CreateFaqAsync(CreateFaqItemDto dto);
    Task UpdateFaqAsync(long id, CreateFaqItemDto dto);
    Task DeleteFaqAsync(long id);

    // Contact Messages
    Task CreateContactMessageAsync(CreateContactMessageDto dto);
    Task<List<ContactMessageDto>> GetContactMessagesAsync();
    Task UpdateContactMessageStatusAsync(long id, string status);

    // Blog
    Task<List<BlogPostDto>> GetPublishedBlogPostsAsync();
    Task<BlogPostDto?> GetBlogPostBySlugAsync(string slug);
    Task<List<BlogPostDto>> GetAllBlogPostsAsync();
    Task<BlogPostDto> CreateBlogPostAsync(long userId, CreateBlogPostDto dto);
    Task UpdateBlogPostAsync(long id, UpdateBlogPostDto dto);
    Task DeleteBlogPostAsync(long id);
    Task PublishBlogPostAsync(long id);
}
