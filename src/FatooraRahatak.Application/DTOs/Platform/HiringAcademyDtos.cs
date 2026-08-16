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
    public string Category { get; set; } = string.Empty;
    public string Duration { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
}

public class UpsertAcademyCourseDto
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
}