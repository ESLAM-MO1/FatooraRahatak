namespace FatooraRahatak.Application.DTOs.Public;

public class PublicStoreFaqItemDto
{
    public long Id { get; set; }
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; }
}