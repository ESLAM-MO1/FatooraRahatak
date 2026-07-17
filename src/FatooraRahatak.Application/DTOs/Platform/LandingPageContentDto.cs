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

    public string ToJson() => JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = false });
    public static LandingPageContentDto FromJson(string json) =>
        JsonSerializer.Deserialize<LandingPageContentDto>(json) ?? new LandingPageContentDto();
}

public class HeroContent
{
    public string Title { get; set; } = "منصة متكاملة لإدارة\nمتجرك بالكامل";
    public string Description { get; set; } = "الفواتير، روابط الدفع، الكاشير، المتجر الإلكتروني، بوابة الدفع — كل ما تحتاجه في نظام واحد لتنمية أعمالك.";
    public string BackgroundImage { get; set; } = "";
    public string PrimaryCta { get; set; } = "ابدأ الآن مجانًا";
    public string PrimaryCtaHref { get; set; } = "/register";
    public string SecondaryCta { get; set; } = "اعرف أكثر";
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
}

public class VideoSectionContent
{
    public string Title { get; set; } = "كل ما تحتاجه في منصة واحدة";
    public string VideoUrl { get; set; } = "";
}

public class FeatureContent
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Image { get; set; } = "";
    public string KnowMoreText { get; set; } = "اعرف المزيد";
    public string KnowMoreHref { get; set; } = "#";
}

public class DistinctiveSectionContent
{
    public string Title { get; set; } = "ما الذي يميزنا؟";
    public List<DistinctiveCard> Cards { get; set; } = new()
    {
        new(){ Title = "أمان وخصوصية عالية", Description = "بياناتك مشفرة ومحمية بأعلى معايير الأمان العالمية." },
        new(){ Title = "واجهات سهلة الاستخدام", Description = "تصميم عصري وبسيط يسهل على الجميع استخدامه دون تعقيد." },
        new(){ Title = "أدوات عديدة في نظام واحد", Description = "المتجر، الفواتير، الكاشير، روابط الدفع، والمزيد في منصة واحدة." },
    };
    public string CtaText { get; set; } = "شاهد كل المزايا";
    public string CtaHref { get; set; } = "#";
}

public class DistinctiveCard
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
}

public class FooterContent
{
    public string Description { get; set; } = "منصة متكاملة لإدارة متجرك الإلكتروني، الفواتير، روابط الدفع، الكاشير، والمزيد.";
    public string Copyright { get; set; } = "جميع الحقوق محفوظة.";
    public SocialContent Social { get; set; } = new();
}

public class SocialContent
{
    public string Facebook { get; set; } = "#";
    public string Instagram { get; set; } = "#";
    public string Whatsapp { get; set; } = "#";
}
