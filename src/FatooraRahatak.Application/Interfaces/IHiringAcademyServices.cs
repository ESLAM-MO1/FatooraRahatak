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
    Task DeleteApplicationAsync(long id);
}

public interface IAcademyService
{
    Task<List<AcademyCourseDto>> GetCoursesAsync(bool activeOnly = false);
    Task<AcademyCourseDto> CreateCourseAsync(UpsertAcademyCourseDto dto);
    Task UpdateCourseAsync(long id, UpsertAcademyCourseDto dto);
    Task DeleteCourseAsync(long id);
}