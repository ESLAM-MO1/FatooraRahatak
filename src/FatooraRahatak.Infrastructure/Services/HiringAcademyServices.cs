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
                Status = a.Status,
                CreatedAt = a.CreatedAt
            })
            .ToListAsync();
    }

    public async Task UpdateApplicationStatusAsync(long id, string status)
    {
        var app = await _context.Set<JobApplication>().FindAsync(id)
            ?? throw new InvalidOperationException("الطلب غير موجود");
        app.Status = status;
        await _context.SaveChangesAsync();
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
                ImageUrl = c.ImageUrl,
                Category = c.Category, Duration = c.Duration, Level = c.Level,
                IsActive = c.IsActive, SortOrder = c.SortOrder,
                LessonsCount = c.Lessons != null ? c.Lessons.Count(l => l.IsActive) : 0
            })
            .ToListAsync();
    }

    public async Task<AcademyCourseDetailDto?> GetCourseByIdAsync(long id, bool activeOnly = false)
    {
        var q = _context.Set<AcademyCourse>().AsQueryable();
        if (activeOnly) q = q.Where(c => c.IsActive);
        var course = await q.Where(c => c.Id == id).FirstOrDefaultAsync();
        if (course == null) return null;

        var lessons = await _context.Set<AcademyLesson>()
            .Where(l => l.CourseId == id)
            .Where(l => !activeOnly || l.IsActive)
            .OrderBy(l => l.SortOrder).ThenBy(l => l.Id)
            .Select(l => new AcademyLessonDto
            {
                Id = l.Id, CourseId = l.CourseId,
                TitleAr = l.TitleAr, TitleEn = l.TitleEn,
                DescriptionAr = l.DescriptionAr, DescriptionEn = l.DescriptionEn,
                VideoUrl = l.VideoUrl, SortOrder = l.SortOrder, IsActive = l.IsActive
            })
            .ToListAsync();

        return new AcademyCourseDetailDto
        {
            Id = course.Id, TitleAr = course.TitleAr, TitleEn = course.TitleEn,
            DescriptionAr = course.DescriptionAr, DescriptionEn = course.DescriptionEn,
            ImageUrl = course.ImageUrl,
            Category = course.Category, Duration = course.Duration, Level = course.Level,
            IsActive = course.IsActive, SortOrder = course.SortOrder,
            Lessons = lessons
        };
    }

    public async Task<AcademyCourseDto> CreateCourseAsync(UpsertAcademyCourseDto dto)
    {
        var course = new AcademyCourse
        {
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn,
            DescriptionAr = dto.DescriptionAr, DescriptionEn = dto.DescriptionEn,
            ImageUrl = dto.ImageUrl,
            Category = dto.Category, Duration = dto.Duration, Level = dto.Level,
            IsActive = dto.IsActive, SortOrder = dto.SortOrder
        };
        _context.Set<AcademyCourse>().Add(course);
        await _context.SaveChangesAsync();
        return new AcademyCourseDto { Id = course.Id, TitleAr = course.TitleAr, TitleEn = course.TitleEn, DescriptionAr = course.DescriptionAr, DescriptionEn = course.DescriptionEn, ImageUrl = course.ImageUrl, Category = course.Category, Duration = course.Duration, Level = course.Level, IsActive = course.IsActive, SortOrder = course.SortOrder };
    }

    public async Task UpdateCourseAsync(long id, UpsertAcademyCourseDto dto)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        course.TitleAr = dto.TitleAr; course.TitleEn = dto.TitleEn;
        course.DescriptionAr = dto.DescriptionAr; course.DescriptionEn = dto.DescriptionEn;
        course.ImageUrl = dto.ImageUrl;
        course.Category = dto.Category; course.Duration = dto.Duration; course.Level = dto.Level;
        course.IsActive = dto.IsActive; course.SortOrder = dto.SortOrder;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteCourseAsync(long id)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(id);
        if (course != null)
        {
            var lessons = await _context.Set<AcademyLesson>().Where(l => l.CourseId == id).ToListAsync();
            if (lessons.Count > 0) _context.Set<AcademyLesson>().RemoveRange(lessons);
            var enrollments = await _context.Set<AcademyEnrollment>().Where(e => e.CourseId == id).ToListAsync();
            if (enrollments.Count > 0) _context.Set<AcademyEnrollment>().RemoveRange(enrollments);
            _context.Set<AcademyCourse>().Remove(course);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<AcademyLessonDto>> GetLessonsAsync(long courseId, bool activeOnly = false)
    {
        var q = _context.Set<AcademyLesson>().Where(l => l.CourseId == courseId);
        if (activeOnly) q = q.Where(l => l.IsActive);
        return await q.OrderBy(l => l.SortOrder).ThenBy(l => l.Id)
            .Select(l => new AcademyLessonDto
            {
                Id = l.Id, CourseId = l.CourseId,
                TitleAr = l.TitleAr, TitleEn = l.TitleEn,
                DescriptionAr = l.DescriptionAr, DescriptionEn = l.DescriptionEn,
                VideoUrl = l.VideoUrl, SortOrder = l.SortOrder, IsActive = l.IsActive
            })
            .ToListAsync();
    }

    public async Task<AcademyLessonDto> CreateLessonAsync(long courseId, UpsertAcademyLessonDto dto)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(courseId)
            ?? throw new InvalidOperationException("الدورة غير موجودة");
        var lesson = new AcademyLesson
        {
            CourseId = courseId,
            TitleAr = dto.TitleAr, TitleEn = dto.TitleEn,
            DescriptionAr = dto.DescriptionAr, DescriptionEn = dto.DescriptionEn,
            VideoUrl = dto.VideoUrl, SortOrder = dto.SortOrder, IsActive = dto.IsActive
        };
        _context.Set<AcademyLesson>().Add(lesson);
        await _context.SaveChangesAsync();
        return new AcademyLessonDto
        {
            Id = lesson.Id, CourseId = lesson.CourseId,
            TitleAr = lesson.TitleAr, TitleEn = lesson.TitleEn,
            DescriptionAr = lesson.DescriptionAr, DescriptionEn = lesson.DescriptionEn,
            VideoUrl = lesson.VideoUrl, SortOrder = lesson.SortOrder, IsActive = lesson.IsActive
        };
    }

    public async Task UpdateLessonAsync(long id, UpsertAcademyLessonDto dto)
    {
        var lesson = await _context.Set<AcademyLesson>().FindAsync(id) ?? throw new InvalidOperationException("غير موجود");
        lesson.TitleAr = dto.TitleAr; lesson.TitleEn = dto.TitleEn;
        lesson.DescriptionAr = dto.DescriptionAr; lesson.DescriptionEn = dto.DescriptionEn;
        lesson.VideoUrl = dto.VideoUrl; lesson.SortOrder = dto.SortOrder; lesson.IsActive = dto.IsActive;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteLessonAsync(long id)
    {
        var lesson = await _context.Set<AcademyLesson>().FindAsync(id);
        if (lesson != null)
        {
            _context.Set<AcademyLesson>().Remove(lesson);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<List<AcademyEnrollmentDto>> GetEnrollmentsAsync(long? courseId = null)
    {
        var q = _context.Set<AcademyEnrollment>().AsQueryable();
        if (courseId.HasValue) q = q.Where(e => e.CourseId == courseId.Value);
        return await q.OrderByDescending(e => e.Id)
            .Select(e => new AcademyEnrollmentDto
            {
                Id = e.Id, CourseId = e.CourseId,
                CourseTitleAr = e.Course != null ? e.Course.TitleAr : "",
                CourseTitleEn = e.Course != null ? e.Course.TitleEn : "",
                ApplicantName = e.ApplicantName, Email = e.Email, Phone = e.Phone, Message = e.Message,
                Status = e.Status, CreatedAt = e.CreatedAt
            })
            .ToListAsync();
    }

    public async Task EnrollAsync(long courseId, EnrollCourseDto dto)
    {
        var course = await _context.Set<AcademyCourse>().FindAsync(courseId)
            ?? throw new InvalidOperationException("الدورة غير موجودة");
        if (!course.IsActive) throw new InvalidOperationException("الدورة غير متاحة للتسجيل");
        _context.Set<AcademyEnrollment>().Add(new AcademyEnrollment
        {
            CourseId = courseId,
            ApplicantName = dto.ApplicantName, Email = dto.Email, Phone = dto.Phone, Message = dto.Message
        });
        await _context.SaveChangesAsync();
    }

    public async Task UpdateEnrollmentStatusAsync(long id, string status)
    {
        var enrollment = await _context.Set<AcademyEnrollment>().FindAsync(id)
            ?? throw new InvalidOperationException("التسجيل غير موجود");
        enrollment.Status = status;
        await _context.SaveChangesAsync();
    }

    public async Task DeleteEnrollmentAsync(long id)
    {
        var enrollment = await _context.Set<AcademyEnrollment>().FindAsync(id);
        if (enrollment != null)
        {
            _context.Set<AcademyEnrollment>().Remove(enrollment);
            await _context.SaveChangesAsync();
        }
    }

    // === إعدادات صفحة الأكاديمية (شرح + صورة) ===
    private const string IntroKey = "academy_page_intro";

    public async Task<AcademyPageIntroDto> GetPageIntroAsync()
    {
        var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == IntroKey);
        if (setting == null || string.IsNullOrWhiteSpace(setting.SettingValue))
            return new AcademyPageIntroDto();

        try
        {
            return System.Text.Json.JsonSerializer.Deserialize<AcademyPageIntroDto>(setting.SettingValue)
                ?? new AcademyPageIntroDto();
        }
        catch
        {
            return new AcademyPageIntroDto();
        }
    }

    public async Task UpdatePageIntroAsync(AcademyPageIntroDto dto)
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new
        {
            dto.TitleAr, dto.TitleEn, dto.DescriptionAr, dto.DescriptionEn, dto.ImageUrl
        });
        var setting = await _context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == IntroKey);
        if (setting == null)
        {
            _context.PlatformSettings.Add(new PlatformSetting
            {
                SettingKey = IntroKey,
                SettingValue = json,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            setting.SettingValue = json;
            setting.UpdatedAt = DateTime.UtcNow;
        }
        await _context.SaveChangesAsync();
    }
}