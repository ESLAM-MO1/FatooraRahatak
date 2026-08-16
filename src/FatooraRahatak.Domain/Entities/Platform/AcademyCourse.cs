using FatooraRahatak.Domain.Common;

namespace FatooraRahatak.Domain.Entities.Platform;

public class AcademyCourse : BaseEntity
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    public ICollection<AcademyLesson>? Lessons { get; set; }
}

public class AcademyLesson : BaseEntity
{
    public long CourseId { get; set; }
    public AcademyCourse? Course { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? VideoUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AcademyEnrollment : BaseEntity
{
    public long CourseId { get; set; }
    public AcademyCourse? Course { get; set; }
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Message { get; set; }
    public string Status { get; set; } = "New";
}