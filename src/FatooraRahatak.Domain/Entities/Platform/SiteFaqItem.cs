using FatooraRahatak.Domain.Common;
namespace FatooraRahatak.Domain.Entities.Platform;

public class SiteFaqItem : BaseEntity
{
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; } = true;
}
