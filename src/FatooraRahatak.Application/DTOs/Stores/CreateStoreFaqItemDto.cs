namespace FatooraRahatak.Application.DTOs.Stores;

public class CreateStoreFaqItemDto
{
    public string QuestionAr { get; set; } = string.Empty;
    public string QuestionEn { get; set; } = string.Empty;
    public string AnswerAr { get; set; } = string.Empty;
    public string AnswerEn { get; set; } = string.Empty;
    public int DisplayOrder { get; set; } = 0;
    public bool IsPublished { get; set; } = true;
}