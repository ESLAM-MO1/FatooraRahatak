using System.Text.Json;

namespace FatooraRahatak.Application.DTOs.Platform;

public class LandingPageContentDto
{
    public string SiteName { get; set; } = "فاتورة راحتك";
    public string SiteDescription { get; set; } = "منصة إدارة المتاجر";
    public HeroContent Hero { get; set; } = new();
    public VideoSectionContent VideoSection { get; set; } = new();
    public List<FeatureContent> Features { get; set; } = new();
    public DistinctiveSectionContent DistinctiveSection { get; set; } = new();
    public FooterContent Footer { get; set; } = new();

    public string ToJson() => JsonSerializer.Serialize(this, new JsonSerializerOptions
    {
        WriteIndented = false,
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    });

    public static LandingPageContentDto FromJson(string json) =>
        JsonSerializer.Deserialize<LandingPageContentDto>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }) ?? new LandingPageContentDto();
}

public class HeroContent
{
    public string Title { get; set; } = "فاتورة راحتك\nنمِّ عملك بذكاء";
    public string? TitleAr { get; set; }
    public string? TitleEn { get; set; }
    public string Description { get; set; } = "اخترنا لك أفضل أدوات التجارة الإلكترونية تحت سقف واحد. من المتجر الإلكتروني، إلى فواتير المبيعات والمشتريات، والقسائم الإلكترونية، ونظام نقاط البيع، والمدفوعات عبر الإنترنت.";
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string BackgroundImage { get; set; } = "";
    public string PrimaryCta { get; set; } = "ابدأ مجاناً";
    public string? PrimaryCtaAr { get; set; }
    public string? PrimaryCtaEn { get; set; }
    public string PrimaryCtaHref { get; set; } = "/register";
    public string SecondaryCta { get; set; } = "اعرف أكثر";
    public string? SecondaryCtaAr { get; set; }
    public string? SecondaryCtaEn { get; set; }
    public string SecondaryCtaHref { get; set; } = "#";
    public List<StatItem> Stats { get; set; } = new()
    {
        new(){ Number = "10,000+", Label = "تاجر" },
        new(){ Number = "50,000+", Label = "فاتورة" },
        new(){ Number = "99.9%", Label = "وقت تشغيل" },
    };
}

public class StatItem
{
    public string Number { get; set; } = "";
    public string Label { get; set; } = "";
    public string? LabelAr { get; set; }
    public string? LabelEn { get; set; }
}

public class VideoSectionContent
{
    public string Title { get; set; } = "كل احتياجات تجارتك في منصة واحدة";
    public string? TitleAr { get; set; }
    public string? TitleEn { get; set; }
    public string Description { get; set; } = "تواصل مع عملائك بسهولة وأبقهم على اطلاع دائم. أرسل روابط الدفع والفواتير عبر وسائل التواصل الاجتماعي لتوفير تجربة دفع سلسة.";
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string VideoUrl { get; set; } = "";
}

public class FeatureContent
{
    public string Title { get; set; } = "";
    public string? TitleAr { get; set; }
    public string? TitleEn { get; set; }
    public string Description { get; set; } = "";
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string Image { get; set; } = "";
    public string KnowMoreText { get; set; } = "اعرف المزيد";
    public string? KnowMoreTextAr { get; set; }
    public string? KnowMoreTextEn { get; set; }
    public string KnowMoreHref { get; set; } = "#";
}

public class DistinctiveSectionContent
{
    public string Title { get; set; } = "لماذا تختار فاتورة راحتك Faturat Rahatik؟";
    public string? TitleAr { get; set; }
    public string? TitleEn { get; set; }
    public List<DistinctiveCard> Cards { get; set; } = new()
    {
        new(){ Title = "أدوات متعددة في نظام واحد", Description = "المتجر، الفواتير، الكاشير، روابط الدفع، والمزيد في منصة واحدة." },
        new(){ Title = "واجهات سهلة الاستخدام", Description = "تصميم عصري وبسيط يسهل على الجميع استخدامه دون تعقيد." },
        new(){ Title = "أمان وخصوصية عاليتان", Description = "بياناتك مشفرة ومحمية بأعلى معايير الأمان العالمية." },
    };
    public string CtaText { get; set; } = "";
    public string? CtaTextAr { get; set; }
    public string? CtaTextEn { get; set; }
    public string CtaHref { get; set; } = "";
}

public class DistinctiveCard
{
    public string Title { get; set; } = "";
    public string? TitleAr { get; set; }
    public string? TitleEn { get; set; }
    public string Description { get; set; } = "";
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
}

public class FooterContent
{
    public string Description { get; set; } = "منصة متكاملة لإدارة متجرك الإلكتروني، الفواتير، روابط الدفع، الكاشير، والمزيد.";
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string Copyright { get; set; } = "جميع الحقوق محفوظة لفاتورة راحتك";
    public string? CopyrightAr { get; set; }
    public string? CopyrightEn { get; set; }
    public SocialContent Social { get; set; } = new();
}

public class SocialContent
{
    public string Facebook { get; set; } = "https://facebook.com/faturatrahatik";
    public string Instagram { get; set; } = "https://instagram.com/faturatrahatik";
    public string Whatsapp { get; set; } = "https://wa.me/966531118224";
    public string Snapchat { get; set; } = "https://snapchat.com/faturatrahatik";
    public string Tiktok { get; set; } = "https://tiktok.com/@faturatrahatik";
    public string Telegram { get; set; } = "https://t.me/faturatrahatik";
    public string Linkedin { get; set; } = "https://linkedin.com/in/faturatrahatik";
}