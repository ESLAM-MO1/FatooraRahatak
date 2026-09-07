namespace FatooraRahatak.Application.DTOs.Platform;

public class SitePageDto
{
    public long Id { get; set; }
    public string PageKey { get; set; } = string.Empty;
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    public string? ImageAr { get; set; }
    public string? ImageEn { get; set; }
}

public class UpdateSitePageDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string ContentEn { get; set; } = string.Empty;
    public string? ImageAr { get; set; }
    public string? ImageEn { get; set; }
}

public class SiteFaqItemDto
{
    public long Id { get; set; }
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; }
}

public class CreateFaqItemDto
{
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}

public class ContactMessageDto
{
    public long Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string TicketNumber { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<TicketReplyDto> Replies { get; set; } = new();
}

public class CreateContactMessageDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "ContactUs";
}

public class TicketReplyDto
{
    public long Id { get; set; }
    public string ReplyText { get; set; } = string.Empty;
    public string RepliedByName { get; set; } = string.Empty;
    public bool IsAdminReply { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateTicketReplyDto
{
    public string ReplyText { get; set; } = string.Empty;
}

public class UpdateTicketStatusDto
{
    public string Status { get; set; } = string.Empty;
}

public class BlogPostDto
{
    public long Id { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string SlugAr { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class CreateBlogPostDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}

public class UpdateBlogPostDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string ContentAr { get; set; } = string.Empty;
    public string? FeaturedImage { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? SeoTitle { get; set; }
    public string? SeoDescription { get; set; }
}
