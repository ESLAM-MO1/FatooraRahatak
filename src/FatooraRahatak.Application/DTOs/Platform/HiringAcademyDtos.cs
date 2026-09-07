namespace FatooraRahatak.Application.DTOs.Platform;

public class JobPostingDto
{
    public long Id { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class UpsertJobPostingDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}

public class JobApplicationDto
{
    public long Id { get; set; }
    public long JobPostingId { get; set; }
    public string JobTitleAr { get; set; } = string.Empty;
    public string JobTitleEn { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? CvUrl { get; set; }
    public string Status { get; set; } = "New";
    public DateTime CreatedAt { get; set; }
}

public class UpdateJobApplicationStatusDto
{
    public string Status { get; set; } = "New";
}

public class ApplyJobDto
{
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? CvUrl { get; set; }
}

public class AcademyCourseDto
{
    public long Id { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public int LessonsCount { get; set; }
}

public class AcademyCourseDetailDto
{
    public long Id { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public List<AcademyLessonDto> Lessons { get; set; } = new();
}

public class AcademyLessonDto
{
    public long Id { get; set; }
    public long CourseId { get; set; }
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? VideoUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
}

public class UpsertAcademyLessonDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? VideoUrl { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
}

public class AcademyEnrollmentDto
{
    public long Id { get; set; }
    public long CourseId { get; set; }
    public string CourseTitleAr { get; set; } = string.Empty;
    public string CourseTitleEn { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Message { get; set; }
    public string Status { get; set; } = "New";
    public DateTime CreatedAt { get; set; }
}

public class EnrollCourseDto
{
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Message { get; set; }
}

public class UpdateAcademyEnrollmentStatusDto
{
    public string Status { get; set; } = "New";
}

public class UpsertAcademyCourseDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
public class AcademyPageIntroDto
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string DescriptionAr { get; set; } = string.Empty;
    public string DescriptionEn { get; set; } = string.Empty;
    public string? ImageUrl { get; set; }
}
