using FatooraRahatak.Application.DTOs.Platform;

namespace FatooraRahatak.Application.Interfaces;

public interface ICareerService
{
    Task<List<JobPostingDto>> GetJobsAsync(bool activeOnly = false);
    Task<JobPostingDto> CreateJobAsync(UpsertJobPostingDto dto);
    Task UpdateJobAsync(long id, UpsertJobPostingDto dto);
    Task DeleteJobAsync(long id);
    Task<List<JobApplicationDto>> GetApplicationsAsync(long? jobId = null);
    Task ApplyAsync(long jobId, ApplyJobDto dto);
    Task UpdateApplicationStatusAsync(long id, string status);
    Task DeleteApplicationAsync(long id);
}

public interface IAcademyService
{
    Task<List<AcademyCourseDto>> GetCoursesAsync(bool activeOnly = false);
    Task<AcademyCourseDetailDto?> GetCourseByIdAsync(long id, bool activeOnly = false);
    Task<AcademyCourseDto> CreateCourseAsync(UpsertAcademyCourseDto dto);
    Task UpdateCourseAsync(long id, UpsertAcademyCourseDto dto);
    Task DeleteCourseAsync(long id);

    Task<List<AcademyLessonDto>> GetLessonsAsync(long courseId, bool activeOnly = false);
    Task<AcademyLessonDto> CreateLessonAsync(long courseId, UpsertAcademyLessonDto dto);
    Task UpdateLessonAsync(long id, UpsertAcademyLessonDto dto);
    Task DeleteLessonAsync(long id);

    Task<List<AcademyEnrollmentDto>> GetEnrollmentsAsync(long? courseId = null);
    Task EnrollAsync(long courseId, EnrollCourseDto dto);
    Task UpdateEnrollmentStatusAsync(long id, string status);
    Task DeleteEnrollmentAsync(long id);

    Task<AcademyPageIntroDto> GetPageIntroAsync();
    Task UpdatePageIntroAsync(AcademyPageIntroDto dto);
}