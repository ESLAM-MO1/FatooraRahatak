using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Stores;

public class StoreFaqItem : BaseEntity
{
    public long StoreId { get; set; }
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
    public bool IsPublished { get; set; } = true;

    public Store Store { get; set; } = null!;
}