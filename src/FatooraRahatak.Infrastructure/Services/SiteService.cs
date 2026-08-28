using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class SiteService : ISiteService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;
    public SiteService(AppDbContext context, INotificationService notificationService) { _context = context; _notificationService = notificationService; }

    // === Landing Page ===
    // ⚠️ إصلاح: الفوتر القديم المحفوظ في قاعدة البيانات (من إصدار قديم) يحتوي
    // social ناقص (Facebook/Instagram/Whatsapp فقط وكلها "#") فتختفي كل أيقونات
    // السوشيال من الصفحة الرئيسية. نضمن هنا أن كل المنصات تُملأ بروابطها
    // الافتراضية الفعلية (ما لم يُعدّل الأدمن قيمةً صراحةً) بغضّ النظر عن بنية
    // القيمة المخزنة قديمًا.
    private static readonly Dictionary<string, string> DefaultSocialLinks = new()
    {
        ["facebook"] = "https://facebook.com/faturatrahatik",
        ["instagram"] = "https://instagram.com/faturatrahatik",
        ["whatsapp"] = "https://wa.me/966531118224",
        ["snapchat"] = "https://snapchat.com/faturatrahatik",
        ["tiktok"] = "https://tiktok.com/@faturatrahatik",
        ["telegram"] = "https://t.me/faturatrahatik",
        ["linkedin"] = "https://linkedin.com/in/faturatrahatik",
    };

    // ⚠️ ترحيل: النسخة القديمة من محتوى الصفحة الرئيسية كانت أحادية اللغة
    // (title, description, ...) بدون فصل عربي/إنجليزي. بعد إضافة الدعم ثنائي
    // اللغة (TitleAr/TitleEn ...) القيم القديمة المحفوظة في قاعدة البيانات لازم
    // تتحول تلقائيًا لتبقى القيمة العربية (لأن المحتوى القديم كله كان عربي)
    // بدل ما تُفقد أو ترجع للقيم الافتراضية.
    private static string MigrateLegacyLandingPageJson(string json)
    {
        try
        {
            var root = System.Text.Json.Nodes.JsonNode.Parse(json)?.AsObject();
            if (root == null) return json;

            void MigrateField(System.Text.Json.Nodes.JsonObject obj, string legacyKey, string arKey)
            {
                if (obj[arKey] == null && obj[legacyKey] != null)
                    obj[arKey] = obj[legacyKey]!.DeepClone();
            }

            MigrateField(root, "siteName", "siteNameAr");
            MigrateField(root, "siteDescription", "siteDescriptionAr");

            if (root["hero"] is System.Text.Json.Nodes.JsonObject hero)
            {
                MigrateField(hero, "title", "titleAr");
                MigrateField(hero, "description", "descriptionAr");
                MigrateField(hero, "primaryCta", "primaryCtaAr");
                MigrateField(hero, "secondaryCta", "secondaryCtaAr");
                if (hero["stats"] is System.Text.Json.Nodes.JsonArray stats)
                    foreach (var s in stats)
                        if (s is System.Text.Json.Nodes.JsonObject so) MigrateField(so, "label", "labelAr");
            }

            if (root["videoSection"] is System.Text.Json.Nodes.JsonObject video)
            {
                MigrateField(video, "title", "titleAr");
                MigrateField(video, "description", "descriptionAr");
            }

            if (root["features"] is System.Text.Json.Nodes.JsonArray features)
                foreach (var f in features)
                    if (f is System.Text.Json.Nodes.JsonObject fo)
                    {
                        MigrateField(fo, "title", "titleAr");
                        MigrateField(fo, "description", "descriptionAr");
                        MigrateField(fo, "knowMoreText", "knowMoreTextAr");
                    }

            if (root["distinctiveSection"] is System.Text.Json.Nodes.JsonObject distinctive)
            {
                MigrateField(distinctive, "title", "titleAr");
                MigrateField(distinctive, "ctaText", "ctaTextAr");
                if (distinctive["cards"] is System.Text.Json.Nodes.JsonArray cards)
                    foreach (var c in cards)
                        if (c is System.Text.Json.Nodes.JsonObject co)
                        {
                            MigrateField(co, "title", "titleAr");
                            MigrateField(co, "description", "descriptionAr");
                        }
            }

            if (root["footer"] is System.Text.Json.Nodes.JsonObject footer)
            {
                MigrateField(footer, "description", "descriptionAr");
                MigrateField(footer, "copyright", "copyrightAr");
            }

            return root.ToJsonString();
        }
        catch
        {
            // لو حصل أي خطأ في الترحيل، نرجع الـ JSON الأصلي والـ deserializer
            // هيتعامل معاه عادي (هيستخدم القيم الافتراضية بس).
            return json;
        }
    }

    public async Task<LandingPageContentDto> GetLandingPageAsync()
    {
        var setting = await _context.PlatformSettings
            .FirstOrDefaultAsync(s => s.SettingKey == "landing_page_content");
        var content = setting == null || string.IsNullOrWhiteSpace(setting.SettingValue)
            ? new LandingPageContentDto()
            : LandingPageContentDto.FromJson(MigrateLegacyLandingPageJson(setting.SettingValue));

        // ✅ دمج الروابط الافتراضية مع القيم المحفوظة (المحفوظة تغلب الافتراضي)
        // حتى تظهر كل منصات السوشيال حتى لو كانت القيمة المخزنة قديمة/ناقصة.
        var social = new Dictionary<string, string>(DefaultSocialLinks, StringComparer.OrdinalIgnoreCase);
        var savedSocial = content.Footer.Social;
        if (savedSocial != null)
        {
            foreach (var prop in typeof(SocialContent).GetProperties())
            {
                var val = prop.GetValue(savedSocial) as string;
                if (!string.IsNullOrWhiteSpace(val) && val != "#")
                    social[prop.Name] = val;
            }
        }
        content.Footer.Social = new SocialContent
        {
            Facebook = social["facebook"],
            Instagram = social["instagram"],
            Whatsapp = social["whatsapp"],
            Snapchat = social["snapchat"],
            Tiktok = social["tiktok"],
            Telegram = social["telegram"],
            Linkedin = social["linkedin"],
        };
        return content;
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
                HasPos = p.HasPos,
                HasLogo = p.HasLogo,
                MaxThemes = p.MaxThemes,
                CommissionPercentage = p.CommissionPercentage,
                Color = p.Color,
                HasShippingIntegration = p.HasShippingIntegration,
                HasShippingCalculator = p.HasShippingCalculator,
                HasShippingTracking = p.HasShippingTracking,
                HasShippingLabelPrinting = p.HasShippingLabelPrinting,
                HasFreeShipping = p.HasFreeShipping,
                HasCashOnDelivery = p.HasCashOnDelivery,
                HasShippingDiscounts = p.HasShippingDiscounts,
            })
            .ToListAsync();
    }

    // === Themes ===
    public async Task<List<string>> GetEnabledThemesAsync()
    {
        return await _context.Themes
            .Where(t => t.IsEnabled)
            .OrderBy(t => t.DisplayOrder)
            .Select(t => t.ThemeKey)
            .ToListAsync();
    }

    // === Pages ===
    public async Task<SitePageDto> GetPageByKeyAsync(string pageKey)
    {
        return await _context.Set<SitePage>()
            .Where(p => p.PageKey == pageKey)
            .Select(p => new SitePageDto { Id = p.Id, PageKey = p.PageKey, TitleAr = p.TitleAr, TitleEn = p.TitleEn, ContentAr = p.ContentAr, ContentEn = p.ContentEn, ImageAr = p.ImageAr, ImageEn = p.ImageEn })
            .FirstOrDefaultAsync() ?? new SitePageDto { PageKey = pageKey };
    }

    public async Task UpdatePageAsync(long userId, string pageKey, UpdateSitePageDto dto)
    {
        var page = await _context.Set<SitePage>().FirstOrDefaultAsync(p => p.PageKey == pageKey);
        if (page == null) { page = new SitePage { PageKey = pageKey }; _context.Set<SitePage>().Add(page); }
        page.TitleAr = dto.TitleAr; page.TitleEn = dto.TitleEn;
        page.ContentAr = dto.ContentAr; page.ContentEn = dto.ContentEn;
        page.ImageAr = dto.ImageAr; page.ImageEn = dto.ImageEn;
        page.UpdatedAt = DateTime.UtcNow; page.UpdatedByUserId = userId;
        await _context.SaveChangesAsync();
    }

    // === FAQ ===
    public async Task<List<SiteFaqItemDto>> GetPublishedFaqAsync()
    {
        return await _context.Set<SiteFaqItem>().Where(f => f.IsPublished).OrderBy(f => f.DisplayOrder)
            .Select(f => new SiteFaqItemDto { Id = f.Id, QuestionAr = f.QuestionAr, QuestionEn = f.QuestionEn, AnswerAr = f.AnswerAr, AnswerEn = f.AnswerEn, DisplayOrder = f.DisplayOrder, IsPublished = f.IsPublished }).ToListAsync();
    }
    public async Task<List<SiteFaqItemDto>> GetAllFaqAsync()
    {
        return await _context.Set<SiteFaqItem>().OrderBy(f => f.DisplayOrder)
            .Select(f => new SiteFaqItemDto { Id = f.Id, QuestionAr = f.QuestionAr, QuestionEn = f.QuestionEn, AnswerAr = f.AnswerAr, AnswerEn = f.AnswerEn, DisplayOrder = f.DisplayOrder, IsPublished = f.IsPublished }).ToListAsync();
    }
    public async Task<SiteFaqItemDto> CreateFaqAsync(CreateFaqItemDto dto)
    {
        var faq = new SiteFaqItem { QuestionAr = dto.QuestionAr, QuestionEn = dto.QuestionEn, AnswerAr = dto.AnswerAr, AnswerEn = dto.AnswerEn, DisplayOrder = dto.DisplayOrder, IsPublished = dto.IsPublished };
        _context.Set<SiteFaqItem>().Add(faq); await _context.SaveChangesAsync();
        return new SiteFaqItemDto { Id = faq.Id, QuestionAr = faq.QuestionAr, QuestionEn = faq.QuestionEn, AnswerAr = faq.AnswerAr, AnswerEn = faq.AnswerEn, DisplayOrder = faq.DisplayOrder, IsPublished = faq.IsPublished };
    }
    public async Task UpdateFaqAsync(long id, CreateFaqItemDto dto)
    {
        var faq = await _context.Set<SiteFaqItem>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        faq.QuestionAr = dto.QuestionAr; faq.QuestionEn = dto.QuestionEn; faq.AnswerAr = dto.AnswerAr; faq.AnswerEn = dto.AnswerEn; faq.DisplayOrder = dto.DisplayOrder; faq.IsPublished = dto.IsPublished;
        await _context.SaveChangesAsync();
    }
    public async Task DeleteFaqAsync(long id)
    {
        var faq = await _context.Set<SiteFaqItem>().FindAsync(id);
        if (faq != null) { _context.Set<SiteFaqItem>().Remove(faq); await _context.SaveChangesAsync(); }
    }
    public async Task ToggleFaqPublishAsync(long id)
    {
        var faq = await _context.Set<SiteFaqItem>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        faq.IsPublished = !faq.IsPublished;
        await _context.SaveChangesAsync();
    }

    // === Contact (Tickets) ===
    private static readonly object _ticketLock = new();
    private static long _lastTicketNum = 0;
    private string GenerateTicketNumber()
    {
        lock (_ticketLock)
        {
            var now = DateTime.UtcNow;
            var prefix = $"TCK-{now:yyyyMMdd}-";
            var last = Interlocked.Increment(ref _lastTicketNum);
            return $"{prefix}{last:D4}";
        }
    }
    public async Task<ContactMessageDto> CreateContactMessageAsync(CreateContactMessageDto dto)
    {
        var ticketNum = GenerateTicketNumber();
        long? userId = null;
        var user = await _context.Set<User>().FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user != null) userId = user.Id;
        var entity = new ContactMessage
        {
            Name = dto.Name, Email = dto.Email, Phone = dto.Phone,
            Subject = dto.Subject, Message = dto.Message, Type = dto.Type,
            TicketNumber = ticketNum, UserId = userId
        };
        _context.Set<ContactMessage>().Add(entity);
        await _context.SaveChangesAsync();
        return new ContactMessageDto
        {
            Id = entity.Id, Name = entity.Name, Email = entity.Email, Phone = entity.Phone,
            Subject = entity.Subject, Message = entity.Message, Type = entity.Type,
            Status = entity.Status, TicketNumber = entity.TicketNumber, CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt
        };
    }
    public async Task<List<ContactMessageDto>> GetContactMessagesAsync(string? statusFilter = null, string? searchQuery = null)
    {
        var query = _context.Set<ContactMessage>().AsQueryable();
        if (!string.IsNullOrWhiteSpace(statusFilter))
            query = query.Where(m => m.Status == statusFilter);
        if (!string.IsNullOrWhiteSpace(searchQuery))
            query = query.Where(m => m.Name.Contains(searchQuery) || m.Email.Contains(searchQuery) || m.Subject.Contains(searchQuery) || m.TicketNumber.Contains(searchQuery));
        return await query.OrderByDescending(m => m.CreatedAt)
            .Select(m => new ContactMessageDto
            {
                Id = m.Id, Name = m.Name, Email = m.Email, Phone = m.Phone,
                Subject = m.Subject, Message = m.Message, Type = m.Type,
                Status = m.Status, TicketNumber = m.TicketNumber,
                CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt,
                Replies = m.TicketReplies.OrderBy(r => r.CreatedAt).Select(r => new TicketReplyDto
                {
                    Id = r.Id, ReplyText = r.ReplyText, RepliedByName = r.RepliedByName,
                    IsAdminReply = r.IsAdminReply, CreatedAt = r.CreatedAt
                }).ToList()
            }).ToListAsync();
    }
    public async Task<ContactMessageDto?> GetContactMessageByIdAsync(long id)
    {
        return await _context.Set<ContactMessage>()
            .Where(m => m.Id == id)
            .Select(m => new ContactMessageDto
            {
                Id = m.Id, Name = m.Name, Email = m.Email, Phone = m.Phone,
                Subject = m.Subject, Message = m.Message, Type = m.Type,
                Status = m.Status, TicketNumber = m.TicketNumber,
                CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt,
                Replies = m.TicketReplies.OrderBy(r => r.CreatedAt).Select(r => new TicketReplyDto
                {
                    Id = r.Id, ReplyText = r.ReplyText, RepliedByName = r.RepliedByName,
                    IsAdminReply = r.IsAdminReply, CreatedAt = r.CreatedAt
                }).ToList()
            }).FirstOrDefaultAsync();
    }
    public async Task UpdateContactMessageStatusAsync(long id, string status)
    {
        var msg = await _context.Set<ContactMessage>().FindAsync(id);
        if (msg == null) return;
        msg.Status = status;
        msg.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        if (msg.UserId.HasValue)
        {
            try
            {
                var statusLabel = status switch
                {
                    "InProgress" => "قيد المعالجة",
                    "Replied" => "تم الرد",
                    "Closed" => "مغلقة",
                    _ => status
                };
                await _notificationService.CreateAsync(
                    msg.UserId.Value,
                    "تحديث حالة التذكرة",
                    $"تم تغيير حالة تذكرتك رقم {msg.TicketNumber} إلى \"{statusLabel}\"",
                    NotificationType.TicketStatusChanged,
                    $"/dashboard/tickets/{msg.Id}");
            }
            catch { }
        }
    }
    public async Task<TicketReplyDto> AddTicketReplyAsync(long ticketId, CreateTicketReplyDto dto, long? adminUserId, string adminName)
    {
        var msg = await _context.Set<ContactMessage>().FindAsync(ticketId);
        if (msg == null) throw new InvalidOperationException("التذكرة غير موجودة");
        var reply = new TicketReply
        {
            TicketId = ticketId, ReplyText = dto.ReplyText,
            RepliedByName = adminName, RepliedByUserId = adminUserId, IsAdminReply = true
        };
        _context.Set<TicketReply>().Add(reply);
        msg.Status = "Replied";
        msg.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        if (msg.UserId.HasValue)
        {
            try
            {
                await _notificationService.CreateAsync(
                    msg.UserId.Value,
                    "رد جديد على تذكرتك",
                    $"تم الرد على تذكرتك رقم {msg.TicketNumber}",
                    NotificationType.TicketReplied,
                    $"/dashboard/tickets/{msg.Id}");
            }
            catch { }
        }
        return new TicketReplyDto { Id = reply.Id, ReplyText = reply.ReplyText, RepliedByName = reply.RepliedByName, IsAdminReply = reply.IsAdminReply, CreatedAt = reply.CreatedAt };
    }
    public async Task DeleteContactMessageAsync(long id)
    {
        var msg = await _context.Set<ContactMessage>().Include(m => m.TicketReplies).FirstOrDefaultAsync(m => m.Id == id);
        if (msg != null) { _context.Set<TicketReply>().RemoveRange(msg.TicketReplies); _context.Set<ContactMessage>().Remove(msg); await _context.SaveChangesAsync(); }
    }

    public async Task<ContactMessageDto?> GetCustomerTicketByIdAsync(long ticketId, long userId)
    {
        return await _context.Set<ContactMessage>()
            .Where(m => m.Id == ticketId && m.UserId == userId)
            .Select(m => new ContactMessageDto
            {
                Id = m.Id, Name = m.Name, Email = m.Email, Phone = m.Phone,
                Subject = m.Subject, Message = m.Message, Type = m.Type,
                Status = m.Status, TicketNumber = m.TicketNumber,
                CreatedAt = m.CreatedAt, UpdatedAt = m.UpdatedAt,
                Replies = m.TicketReplies.OrderBy(r => r.CreatedAt).Select(r => new TicketReplyDto
                {
                    Id = r.Id, ReplyText = r.ReplyText, RepliedByName = r.RepliedByName,
                    IsAdminReply = r.IsAdminReply, CreatedAt = r.CreatedAt
                }).ToList()
            }).FirstOrDefaultAsync();
    }
    public async Task<TicketReplyDto> AddCustomerTicketReplyAsync(long ticketId, CreateTicketReplyDto dto, long userId, string userName)
    {
        var msg = await _context.Set<ContactMessage>().FirstOrDefaultAsync(m => m.Id == ticketId && m.UserId == userId);
        if (msg == null) throw new InvalidOperationException("التذكرة غير موجودة");
        var reply = new TicketReply
        {
            TicketId = ticketId, ReplyText = dto.ReplyText,
            RepliedByName = userName, RepliedByUserId = userId, IsAdminReply = false
        };
        _context.Set<TicketReply>().Add(reply);
        msg.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return new TicketReplyDto { Id = reply.Id, ReplyText = reply.ReplyText, RepliedByName = reply.RepliedByName, IsAdminReply = reply.IsAdminReply, CreatedAt = reply.CreatedAt };
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