using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Banners;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Banners;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class BannerService : IBannerService
{
    private readonly AppDbContext _context;

    public BannerService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<BannerDto>> GetBannersAsync(long storeId)
    {
        return await _context.Set<Banner>()
            .Where(b => b.StoreId == storeId)
            .OrderBy(b => b.Position)
            .ThenBy(b => b.SortOrder)
            .Select(b => new BannerDto
            {
                Id = b.Id,
                StoreId = b.StoreId,
                Title = b.Title,
                ImageUrl = b.ImageUrl,
                LinkUrl = b.LinkUrl,
                Position = b.Position.ToString(),
                SortOrder = b.SortOrder,
                StartDate = b.StartDate,
                EndDate = b.EndDate,
                IsActive = b.IsActive,
                CreatedAt = b.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<BannerDto> CreateBannerAsync(long storeId, CreateBannerDto dto)
    {
        var imageUrl = ValidateAndSaveImage(dto.ImageBase64);

        if (!Enum.TryParse<BannerPosition>(dto.Position, true, out var position))
            throw new InvalidOperationException("موضع البنر غير صالح");

        var banner = new Banner
        {
            StoreId = storeId,
            Title = dto.Title,
            ImageUrl = imageUrl,
            LinkUrl = dto.LinkUrl,
            Position = position,
            SortOrder = dto.SortOrder,
            StartDate = dto.StartDate,
            EndDate = dto.EndDate,
            IsActive = dto.IsActive
        };

        _context.Set<Banner>().Add(banner);
        await _context.SaveChangesAsync();

        return new BannerDto
        {
            Id = banner.Id,
            StoreId = banner.StoreId,
            Title = banner.Title,
            ImageUrl = banner.ImageUrl,
            LinkUrl = banner.LinkUrl,
            Position = banner.Position.ToString(),
            SortOrder = banner.SortOrder,
            StartDate = banner.StartDate,
            EndDate = banner.EndDate,
            IsActive = banner.IsActive,
            CreatedAt = banner.CreatedAt
        };
    }

    public async Task<BannerDto?> UpdateBannerAsync(long storeId, long bannerId, UpdateBannerDto dto)
    {
        var banner = await _context.Set<Banner>()
            .FirstOrDefaultAsync(b => b.Id == bannerId && b.StoreId == storeId);

        if (banner == null) return null;

        if (!string.IsNullOrWhiteSpace(dto.Title))
            banner.Title = dto.Title;

        if (!string.IsNullOrWhiteSpace(dto.ImageBase64))
            banner.ImageUrl = ValidateAndSaveImage(dto.ImageBase64);

        if (dto.LinkUrl != null)
            banner.LinkUrl = string.IsNullOrWhiteSpace(dto.LinkUrl) ? null : dto.LinkUrl;

        if (!string.IsNullOrWhiteSpace(dto.Position) && Enum.TryParse<BannerPosition>(dto.Position, true, out var position))
            banner.Position = position;

        if (dto.SortOrder.HasValue)
            banner.SortOrder = dto.SortOrder.Value;

        if (dto.StartDate != null)
            banner.StartDate = dto.StartDate;

        if (dto.EndDate != null)
            banner.EndDate = dto.EndDate;

        if (dto.IsActive.HasValue)
            banner.IsActive = dto.IsActive.Value;

        await _context.SaveChangesAsync();

        return new BannerDto
        {
            Id = banner.Id,
            StoreId = banner.StoreId,
            Title = banner.Title,
            ImageUrl = banner.ImageUrl,
            LinkUrl = banner.LinkUrl,
            Position = banner.Position.ToString(),
            SortOrder = banner.SortOrder,
            StartDate = banner.StartDate,
            EndDate = banner.EndDate,
            IsActive = banner.IsActive,
            CreatedAt = banner.CreatedAt
        };
    }

    public async Task<bool> DeleteBannerAsync(long storeId, long bannerId)
    {
        var banner = await _context.Set<Banner>()
            .FirstOrDefaultAsync(b => b.Id == bannerId && b.StoreId == storeId);

        if (banner == null) return false;

        _context.Set<Banner>().Remove(banner);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<PublicBannerDto>> GetActiveBannersAsync(long storeId)
    {
        var now = DateTime.UtcNow;
        return await _context.Set<Banner>()
            .Where(b => b.StoreId == storeId && b.IsActive &&
                (b.StartDate == null || b.StartDate <= now) &&
                (b.EndDate == null || b.EndDate >= now))
            .OrderBy(b => b.Position)
            .ThenBy(b => b.SortOrder)
            .Select(b => new PublicBannerDto
            {
                Id = b.Id,
                Title = b.Title,
                ImageUrl = b.ImageUrl,
                LinkUrl = b.LinkUrl,
                Position = b.Position.ToString()
            })
            .ToListAsync();
    }

    private static string ValidateAndSaveImage(string imageBase64)
    {
        if (string.IsNullOrWhiteSpace(imageBase64))
            throw new InvalidOperationException("يجب إرسال صورة البنر بصيغة Base64");

        var img = imageBase64.Trim();
        if (!img.Contains("base64,", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("صورة غير صالحة: يجب أن تكون بيانات صورة بصيغة Base64");

        var prefix = img[..(img.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)];
        var data = img[(img.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)..];

        if (!prefix.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("صورة غير صالحة: الصيغة يجب أن تكون صورة (PNG / JPG / JPEG / WebP / GIF / SVG)");

        if (data.Length > 5 * 1024 * 1024)
            throw new InvalidOperationException("حجم الصورة كبير جدًا (الحد الأقصى 5 ميجابايت)");

        try
        {
            Convert.FromBase64String(data);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("صورة غير صالحة: بيانات Base64 غير صحيحة");
        }

        return img;
    }
}