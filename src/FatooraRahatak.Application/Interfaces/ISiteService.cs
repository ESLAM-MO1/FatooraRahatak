using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface ISiteService
{
    // Landing Page
    Task<LandingPageContentDto> GetLandingPageAsync();
    Task UpdateLandingPageAsync(LandingPageContentDto dto);

    // Packages
    Task<List<PublicPackageDto>> GetAllActivePackagesAsync();

    // Themes
    Task<List<string>> GetEnabledThemesAsync();

    // Pages
    Task<SitePageDto> GetPageByKeyAsync(string pageKey);
    Task UpdatePageAsync(long userId, string pageKey, UpdateSitePageDto dto);

    // FAQ
    Task<List<SiteFaqItemDto>> GetPublishedFaqAsync();
    Task<List<SiteFaqItemDto>> GetAllFaqAsync();
    Task<SiteFaqItemDto> CreateFaqAsync(CreateFaqItemDto dto);
    Task UpdateFaqAsync(long id, CreateFaqItemDto dto);
    Task DeleteFaqAsync(long id);
    Task ToggleFaqPublishAsync(long id);

    // Contact Messages (Tickets)
    Task<ContactMessageDto> CreateContactMessageAsync(CreateContactMessageDto dto);
    Task<List<ContactMessageDto>> GetContactMessagesAsync(string? statusFilter = null, string? searchQuery = null);
    Task<ContactMessageDto?> GetContactMessageByIdAsync(long id);
    Task UpdateContactMessageStatusAsync(long id, string status);
    Task<TicketReplyDto> AddTicketReplyAsync(long ticketId, CreateTicketReplyDto dto, long? adminUserId, string adminName);
    Task DeleteContactMessageAsync(long id);
    Task<ContactMessageDto?> GetCustomerTicketByIdAsync(long ticketId, long userId);
    Task<TicketReplyDto> AddCustomerTicketReplyAsync(long ticketId, CreateTicketReplyDto dto, long userId, string userName);

    // Blog
    Task<List<BlogPostDto>> GetPublishedBlogPostsAsync();
    Task<BlogPostDto?> GetBlogPostBySlugAsync(string slug);
    Task<List<BlogPostDto>> GetAllBlogPostsAsync();
    Task<BlogPostDto> CreateBlogPostAsync(long userId, CreateBlogPostDto dto);
    Task UpdateBlogPostAsync(long id, UpdateBlogPostDto dto);
    Task DeleteBlogPostAsync(long id);
    Task PublishBlogPostAsync(long id);
}
