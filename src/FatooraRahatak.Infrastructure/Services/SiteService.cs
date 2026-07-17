using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SiteService : ISiteService
{
    private readonly AppDbContext _context;
    public SiteService(AppDbContext context) { _context = context; }

    // === Landing Page ===
    public async Task<LandingPageContentDto> GetLandingPageAsync()
    {
        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_content");
        if (setting == null || string.IsNullOrWhiteSpace(setting.SettingValue))
            return new LandingPageContentDto();
        return LandingPageContentDto.FromJson(setting.SettingValue);
    }

    public async Task UpdateLandingPageAsync(LandingPageContentDto dto)
    {
        var json = dto.ToJson();
        var existing = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_content");
        if (existing == null)
        {
            _context.PlatformSettings.Add(new PlatformSetting
            {
                SettingKey = "landing_page_content",
                SettingValue = json,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.SettingValue = json;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
    }

    // === Packages ===
    public async Task<List<PublicPackageDto>> GetAllActivePackagesAsync()
    {
        return await _context.Set<Package>()
            .Where(p => p.IsActive)
            .OrderBy(p => p.MonthlyPrice)
            .Select(p => new PublicPackageDto
            {
                Id = p.Id,
                Name = p.PackageName,
                MonthlyPrice = p.MonthlyPrice,
                MaxProducts = p.MaxProducts,
                MaxOrdersPerMonth = p.MaxOrdersPerMonth,
                MaxEmployees = p.MaxEmployees,
                MaxWarehouses = p.MaxWarehouses,
                MaxBranchesPOS = p.MaxBranchesPOS,
                MaxPaymentGateways = p.MaxPaymentGateways,
                MaxShippingCompanies = p.MaxShippingCompanies,
                HasAccountingFull = p.HasAccountingFull,
                HasPayroll = p.HasPayroll,
                HasZatcaInvoice = p.HasZatcaInvoice,
                HasCustomDomain = p.HasCustomDomain,
                HasAffiliateMarketing = p.HasAffiliateMarketing,
                HasApiAccess = p.HasApiAccess,
                MaxThemes = p.MaxThemes,
                CommissionPercentage = p.CommissionPercentage,
            })
            .ToListAsync();
    }

    // === Pages ===
    public async Task<SitePageDto?> GetPageByKeyAsync(string pageKey)
    {
        return await _context.Set<SitePage>()
            .Where(p => p.PageKey == pageKey)
            .Select(p => new SitePageDto { Id = p.Id, PageKey = p.PageKey, TitleAr = p.TitleAr, TitleEn = p.TitleEn, ContentAr = p.ContentAr, ContentEn = p.ContentEn })
            .FirstOrDefaultAsync();
    }

    public async Task UpdatePageAsync(long userId, string pageKey, UpdateSitePageDto dto)
    {
        var page = await _context.Set<SitePage>().FirstOrDefaultAsync(p => p.PageKey == pageKey);
        if (page == null) { page = new SitePage { PageKey = pageKey }; _context.Set<SitePage>().Add(page); }
        page.TitleAr = dto.TitleAr; page.TitleEn = dto.TitleEn;
        page.ContentAr = dto.ContentAr; page.ContentEn = dto.ContentEn;
        page.UpdatedAt = DateTime.UtcNow; page.UpdatedByUserId = userId;
        await _context.SaveChangesAsync();
    }

    // === FAQ ===
    public async Task<List<SiteFaqItemDto>> GetPublishedFaqAsync()
    {
        return await _context.Set<SiteFaqItem>().Where(f => f.IsPublished).OrderBy(f => f.DisplayOrder)
            .Select(f => new SiteFaqItemDto { Id = f.Id, QuestionAr = f.QuestionAr, AnswerAr = f.AnswerAr, DisplayOrder = f.DisplayOrder, IsPublished = f.IsPublished }).ToListAsync();
    }
    public async Task<List<SiteFaqItemDto>> GetAllFaqAsync()
    {
        return await _context.Set<SiteFaqItem>().OrderBy(f => f.DisplayOrder)
            .Select(f => new SiteFaqItemDto { Id = f.Id, QuestionAr = f.QuestionAr, AnswerAr = f.AnswerAr, DisplayOrder = f.DisplayOrder, IsPublished = f.IsPublished }).ToListAsync();
    }
    public async Task<SiteFaqItemDto> CreateFaqAsync(CreateFaqItemDto dto)
    {
        var faq = new SiteFaqItem { QuestionAr = dto.QuestionAr, AnswerAr = dto.AnswerAr, DisplayOrder = dto.DisplayOrder };
        _context.Set<SiteFaqItem>().Add(faq); await _context.SaveChangesAsync();
        return new SiteFaqItemDto { Id = faq.Id, QuestionAr = faq.QuestionAr, AnswerAr = faq.AnswerAr, DisplayOrder = faq.DisplayOrder, IsPublished = faq.IsPublished };
    }
    public async Task UpdateFaqAsync(long id, CreateFaqItemDto dto)
    {
        var faq = await _context.Set<SiteFaqItem>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        faq.QuestionAr = dto.QuestionAr; faq.AnswerAr = dto.AnswerAr; faq.DisplayOrder = dto.DisplayOrder;
        await _context.SaveChangesAsync();
    }
    public async Task DeleteFaqAsync(long id)
    {
        var faq = await _context.Set<SiteFaqItem>().FindAsync(id);
        if (faq != null) { _context.Set<SiteFaqItem>().Remove(faq); await _context.SaveChangesAsync(); }
    }

    // === Contact ===
    public async Task CreateContactMessageAsync(CreateContactMessageDto dto)
    {
        _context.Set<ContactMessage>().Add(new ContactMessage { Name = dto.Name, Email = dto.Email, Phone = dto.Phone, Subject = dto.Subject, Message = dto.Message, Type = dto.Type });
        await _context.SaveChangesAsync();
    }
    public async Task<List<ContactMessageDto>> GetContactMessagesAsync()
    {
        return await _context.Set<ContactMessage>().OrderByDescending(m => m.CreatedAt)
            .Select(m => new ContactMessageDto { Id = m.Id, Name = m.Name, Email = m.Email, Phone = m.Phone, Subject = m.Subject, Message = m.Message, Type = m.Type, Status = m.Status, CreatedAt = m.CreatedAt }).ToListAsync();
    }
    public async Task UpdateContactMessageStatusAsync(long id, string status)
    {
        var msg = await _context.Set<ContactMessage>().FindAsync(id);
        if (msg != null) { msg.Status = status; await _context.SaveChangesAsync(); }
    }

    // === Blog ===
    public async Task<List<BlogPostDto>> GetPublishedBlogPostsAsync()
    {
        return await _context.Set<BlogPost>().Where(b => b.Status == "Published").OrderByDescending(b => b.PublishedAt)
            .Select(b => new BlogPostDto { Id = b.Id, TitleAr = b.TitleAr, SlugAr = b.SlugAr, ContentAr = b.ContentAr, FeaturedImage = b.FeaturedImage, AuthorName = b.AuthorName, Status = b.Status, PublishedAt = b.PublishedAt, SeoTitle = b.SeoTitle ?? b.TitleAr, SeoDescription = b.SeoDescription }).ToListAsync();
    }
    public async Task<BlogPostDto?> GetBlogPostBySlugAsync(string slug)
    {
        return await _context.Set<BlogPost>().Where(b => b.SlugAr == slug && b.Status == "Published")
            .Select(b => new BlogPostDto { Id = b.Id, TitleAr = b.TitleAr, SlugAr = b.SlugAr, ContentAr = b.ContentAr, FeaturedImage = b.FeaturedImage, AuthorName = b.AuthorName, Status = b.Status, PublishedAt = b.PublishedAt, SeoTitle = b.SeoTitle ?? b.TitleAr, SeoDescription = b.SeoDescription }).FirstOrDefaultAsync();
    }
    public async Task<List<BlogPostDto>> GetAllBlogPostsAsync()
    {
        return await _context.Set<BlogPost>().OrderByDescending(b => b.CreatedAt)
            .Select(b => new BlogPostDto { Id = b.Id, TitleAr = b.TitleAr, SlugAr = b.SlugAr, ContentAr = b.ContentAr, FeaturedImage = b.FeaturedImage, AuthorName = b.AuthorName, Status = b.Status, PublishedAt = b.PublishedAt }).ToListAsync();
    }
    public async Task<BlogPostDto> CreateBlogPostAsync(long userId, CreateBlogPostDto dto)
    {
        var slug = dto.TitleAr.Trim().Replace(" ", "-").Replace("--", "-");
        var post = new BlogPost { TitleAr = dto.TitleAr, SlugAr = slug, ContentAr = dto.ContentAr, FeaturedImage = dto.FeaturedImage, AuthorName = dto.AuthorName, SeoTitle = dto.SeoTitle, SeoDescription = dto.SeoDescription, Status = "Draft" };
        _context.Set<BlogPost>().Add(post); await _context.SaveChangesAsync();
        return new BlogPostDto { Id = post.Id, TitleAr = post.TitleAr, SlugAr = post.SlugAr, Status = post.Status };
    }
    public async Task UpdateBlogPostAsync(long id, UpdateBlogPostDto dto)
    {
        var post = await _context.Set<BlogPost>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        post.TitleAr = dto.TitleAr; post.ContentAr = dto.ContentAr; post.FeaturedImage = dto.FeaturedImage;
        post.AuthorName = dto.AuthorName; post.SeoTitle = dto.SeoTitle; post.SeoDescription = dto.SeoDescription;
        await _context.SaveChangesAsync();
    }
    public async Task DeleteBlogPostAsync(long id)
    {
        var post = await _context.Set<BlogPost>().FindAsync(id);
        if (post != null) { _context.Set<BlogPost>().Remove(post); await _context.SaveChangesAsync(); }
    }
    public async Task PublishBlogPostAsync(long id)
    {
        var post = await _context.Set<BlogPost>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        post.Status = "Published"; post.PublishedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
    }
}
