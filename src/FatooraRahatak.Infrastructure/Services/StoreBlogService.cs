using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class StoreBlogService : IStoreBlogService
{
    private readonly AppDbContext _context;

    public StoreBlogService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<StoreBlogPostResponseDto>> GetAllAsync(long storeId)
    {
        return await _context.StoreBlogPosts
            .Where(b => b.StoreId == storeId)
            .OrderByDescending(b => b.PublishedAt)
            .ThenByDescending(b => b.CreatedAt)
            .Select(b => new StoreBlogPostResponseDto
            {
                Id = b.Id,
                TitleAr = b.TitleAr,
                TitleEn = b.TitleEn,
                SlugAr = b.SlugAr,
                SlugEn = b.SlugEn,
                ContentAr = b.ContentAr,
                ContentEn = b.ContentEn,
                FeaturedImage = b.FeaturedImage,
                AuthorName = b.AuthorName,
                Status = b.Status,
                PublishedAt = b.PublishedAt,
                CreatedAt = b.CreatedAt,
                SeoTitle = b.SeoTitle,
                SeoDescription = b.SeoDescription
            })
            .ToListAsync();
    }

    public async Task<StoreBlogPostResponseDto?> GetByIdAsync(long storeId, long id)
    {
        var post = await _context.StoreBlogPosts
            .FirstOrDefaultAsync(b => b.Id == id && b.StoreId == storeId);

        return post == null ? null : MapToDto(post);
    }

    public async Task<StoreBlogPostResponseDto> CreateAsync(long storeId, CreateStoreBlogPostDto dto)
    {
        var post = new StoreBlogPost
        {
            StoreId = storeId,
            TitleAr = dto.TitleAr,
            TitleEn = dto.TitleEn,
            SlugAr = dto.SlugAr,
            SlugEn = dto.SlugEn,
            ContentAr = dto.ContentAr,
            ContentEn = dto.ContentEn,
            FeaturedImage = dto.FeaturedImage,
            AuthorName = dto.AuthorName,
            Status = dto.Status == "Published" ? "Published" : "Draft",
            PublishedAt = dto.Status == "Published" ? DateTime.UtcNow : null,
            SeoTitle = dto.SeoTitle,
            SeoDescription = dto.SeoDescription
        };

        _context.StoreBlogPosts.Add(post);
        await _context.SaveChangesAsync();

        return MapToDto(post);
    }

    public async Task<StoreBlogPostResponseDto> UpdateAsync(long storeId, long id, CreateStoreBlogPostDto dto)
    {
        var post = await _context.StoreBlogPosts
            .FirstOrDefaultAsync(b => b.Id == id && b.StoreId == storeId);

        if (post == null)
            throw new InvalidOperationException("المقال غير موجود");

        post.TitleAr = dto.TitleAr;
        post.TitleEn = dto.TitleEn;
        post.SlugAr = dto.SlugAr;
        post.SlugEn = dto.SlugEn;
        post.ContentAr = dto.ContentAr;
        post.ContentEn = dto.ContentEn;
        post.FeaturedImage = dto.FeaturedImage;
        post.AuthorName = dto.AuthorName;
        post.SeoTitle = dto.SeoTitle;
        post.SeoDescription = dto.SeoDescription;

        if (dto.Status == "Published" && post.Status != "Published")
        {
            post.Status = "Published";
            post.PublishedAt = post.PublishedAt ?? DateTime.UtcNow;
        }
        else if (dto.Status == "Draft")
        {
            post.Status = "Draft";
        }

        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(post);
    }

    public async Task<StoreBlogPostResponseDto> TogglePublishAsync(long storeId, long id)
    {
        var post = await _context.StoreBlogPosts
            .FirstOrDefaultAsync(b => b.Id == id && b.StoreId == storeId);

        if (post == null)
            throw new InvalidOperationException("المقال غير موجود");

        if (post.Status == "Published")
        {
            post.Status = "Draft";
        }
        else
        {
            post.Status = "Published";
            post.PublishedAt = post.PublishedAt ?? DateTime.UtcNow;
        }

        post.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(post);
    }

    public async Task DeleteAsync(long storeId, long id)
    {
        var post = await _context.StoreBlogPosts
            .FirstOrDefaultAsync(b => b.Id == id && b.StoreId == storeId);

        if (post == null)
            throw new InvalidOperationException("المقال غير موجود");

        _context.StoreBlogPosts.Remove(post);
        await _context.SaveChangesAsync();
    }

    private static StoreBlogPostResponseDto MapToDto(StoreBlogPost b) => new()
    {
        Id = b.Id,
        TitleAr = b.TitleAr,
        TitleEn = b.TitleEn,
        SlugAr = b.SlugAr,
        SlugEn = b.SlugEn,
        ContentAr = b.ContentAr,
        ContentEn = b.ContentEn,
        FeaturedImage = b.FeaturedImage,
        AuthorName = b.AuthorName,
        Status = b.Status,
        PublishedAt = b.PublishedAt,
        CreatedAt = b.CreatedAt,
        SeoTitle = b.SeoTitle,
        SeoDescription = b.SeoDescription
    };
}