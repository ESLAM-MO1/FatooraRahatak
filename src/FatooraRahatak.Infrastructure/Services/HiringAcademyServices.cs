using FatooraRahatak.Application.DTOs.Platform;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class CareerService : ICareerService
{
    private readonly AppDbContext _context;
    public CareerService(AppDbContext context) { _context = context; }

    public async Task<List<JobPostingDto>> GetJobsAsync(bool activeOnly = false)
    {
        var q = _context.Set<JobPosting>().AsQueryable();
        if (activeOnly) q = q.Where(j => j.IsActive);
        return await q.OrderBy(j => j.SortOrder).ThenByDescending(j => j.Id)
            .Select(j => new JobPostingDto
            {
                Id = j.Id, TitleAr = j.TitleAr, TitleEn = j.TitleEn,
                DescriptionAr = j.DescriptionAr, DescriptionEn = j.DescriptionEn,
                Location = j.Location, Type = j.Type, IsActive = j.IsActive, SortOrder = j.SortOrder,
                CreatedAt = j.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<JobPostingDto> CreateJobAsync(UpsertJobPostingDto dto)
    {
        var job = new JobPosting
        {
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn,
            DescriptionAr = dto.DescriptionAr, DescriptionEn = dto.DescriptionEn,
            Location = dto.Location, Type = dto.Type, IsActive = dto.IsActive, SortOrder = dto.SortOrder
        };
        _context.Set<JobPosting>().Add(job);
        await _context.SaveChangesAsync();
        return new JobPostingDto { Id = job.Id, TitleAr = job.TitleAr, TitleEn = job.TitleEn, DescriptionAr = job.DescriptionAr, DescriptionEn = job.DescriptionEn, Location = job.Location, Type = job.Type, IsActive = job.IsActive, SortOrder = job.SortOrder, CreatedAt = job.CreatedAt };
    }

    public async Task UpdateJobAsync(long id, UpsertJobPostingDto dto)
    {
        var job = await _context.Set<JobPosting>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        job.TitleAr = dto.TitleAr; job.TitleEn = dto.TitleEn;
        job.DescriptionAr = dto.DescriptionAr; job.DescriptionEn = dto.DescriptionEn;
        job.Location = dto.Location; job.Type = dto.Type; job.IsActive = dto.IsActive; job.SortOrder = dto.SortOrder;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteJobAsync(long id)
    {
        var job = await _context.Set<JobPosting>().FindAsync(id);
        if (job != null)
        {
            _context.Set<JobPosting>().Remove(job);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<JobApplicationDto>> GetApplicationsAsync(long? jobId = null)
    {
        var q = _context.Set<JobApplication>().AsQueryable();
        if (jobId.HasValue) q = q.Where(a => a.JobPostingId == jobId.Value);
        return await q.OrderByDescending(a => a.Id)
            .Select(a => new JobApplicationDto
            {
                Id = a.Id, JobPostingId = a.JobPostingId,
                JobTitleAr = a.JobPosting != null ? a.JobPosting.TitleAr : "",
                JobTitleEn = a.JobPosting != null ? a.JobPosting.TitleEn : "",
                ApplicantName = a.ApplicantName, Email = a.Email, Phone = a.Phone, Message = a.Message, CvUrl = a.CvUrl,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task ApplyAsync(long jobId, ApplyJobDto dto)
    {
        var job = await _context.Set<JobPosting>().FindAsync(jobId)
            ?? throw new InvalidOperationException("الوظيفة غير موجودة");
        if (!job.IsActive) throw new InvalidOperationException("الوظيفة غير متاحة للتقديم");
        _context.Set<JobApplication>().Add(new JobApplication
        {
            JobPostingId = jobId,
            ApplicantName = dto.ApplicantName, Email = dto.Email, Phone = dto.Phone, Message = dto.Message, CvUrl = dto.CvUrl
        });
        await _context.SaveChangesAsync();
    }

    public async Task DeleteApplicationAsync(long id)
    {
        var app = await _context.Set<JobApplication>().FindAsync(id);
        if (app != null)
        {
            _context.Set<JobApplication>().Remove(app);
            await _context.SaveChangesAsync();
        }
    }
}

public class AcademyService : IAcademyService
{
    private readonly AppDbContext _context;
    public AcademyService(AppDbContext context) { _context = context; }

    public async Task<List<AcademyCourseDto>> GetCoursesAsync(bool activeOnly = false)
    {
        var q = _context.Set<AcademyCourse>().AsQueryable();
        if (activeOnly) q = q.Where(c => c.IsActive);
        return await q.OrderBy(c => c.SortOrder).ThenByDescending(c => c.Id)
            .Select(c => new AcademyCourseDto
            {
                Id = c.Id, TitleAr = c.TitleAr, TitleEn = c.TitleEn,
                DescriptionAr = c.DescriptionAr, DescriptionEn = c.DescriptionEn,
                Category = c.Category, Duration = c.Duration, Level = c.Level,
                IsActive = c.IsActive, SortOrder = c.SortOrder
            })
            .ToListAsync();
    }

    public async Task<AcademyCourseDto> CreateCourseAsync(UpsertAcademyCourseDto dto)
    {
        var course = new AcademyCourse
        {
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn,
            DescriptionAr = dto.DescriptionAr, DescriptionEn = dto.DescriptionEn,
            Category = dto.Category, Duration = dto.Duration, Level = dto.Level,
            IsActive = dto.IsActive, SortOrder = dto.SortOrder
        };
        _context.Set<AcademyCourse>().Add(course);
        await _context.SaveChangesAsync();
        return new AcademyCourseDto { Id = course.Id, TitleAr = course.TitleAr, TitleEn = course.TitleEn, DescriptionAr = course.DescriptionAr, DescriptionEn = course.DescriptionEn, Category = course.Category, Duration = course.Duration, Level = course.Level, IsActive = course.IsActive, SortOrder = course.SortOrder };
    }

    public async Task UpdateCourseAsync(long id, UpsertAcademyCourseDto dto)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        course.TitleAr = dto.TitleAr; course.TitleEn = dto.TitleEn;
        course.DescriptionAr = dto.DescriptionAr; course.DescriptionEn = dto.DescriptionEn;
        course.Category = dto.Category; course.Duration = dto.Duration; course.Level = dto.Level;
        course.IsActive = dto.IsActive; course.SortOrder = dto.SortOrder;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCourseAsync(long id)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(id);
        if (course != null)
        {
            _context.Set<AcademyCourse>().Remove(course);
            await _context.SaveChangesAsync();
        }
    }
}