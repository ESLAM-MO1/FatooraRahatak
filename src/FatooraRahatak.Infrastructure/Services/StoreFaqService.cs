using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class StoreFaqService : IStoreFaqService
{
    private readonly AppDbContext _context;

    public StoreFaqService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<StoreFaqItemResponseDto>> GetAllAsync(long storeId)
    {
        return await _context.StoreFaqItems
            .Where(f => f.StoreId == storeId)
            .OrderBy(f => f.DisplayOrder)
            .ThenBy(f => f.Id)
            .Select(f => new StoreFaqItemResponseDto
            {
                Id = f.Id,
                QuestionAr = f.QuestionAr,
                QuestionEn = f.QuestionEn,
                AnswerAr = f.AnswerAr,
                AnswerEn = f.AnswerEn,
                DisplayOrder = f.DisplayOrder,
                IsPublished = f.IsPublished
            })
            .ToListAsync();
    }

    public async Task<StoreFaqItemResponseDto> CreateAsync(long storeId, CreateStoreFaqItemDto dto)
    {
        var item = new StoreFaqItem
        {
            StoreId = storeId,
            QuestionAr = dto.QuestionAr,
            QuestionEn = dto.QuestionEn,
            AnswerAr = dto.AnswerAr,
            AnswerEn = dto.AnswerEn,
            DisplayOrder = dto.DisplayOrder,
            IsPublished = dto.IsPublished
        };

        _context.StoreFaqItems.Add(item);
        await _context.SaveChangesAsync();

        return MapToDto(item);
    }

    public async Task<StoreFaqItemResponseDto> UpdateAsync(long storeId, long id, CreateStoreFaqItemDto dto)
    {
        var item = await _context.StoreFaqItems
            .FirstOrDefaultAsync(f => f.Id == id && f.StoreId == storeId);

        if (item == null)
            throw new InvalidOperationException("السؤال غير موجود");

        item.QuestionAr = dto.QuestionAr;
        item.QuestionEn = dto.QuestionEn;
        item.AnswerAr = dto.AnswerAr;
        item.AnswerEn = dto.AnswerEn;
        item.DisplayOrder = dto.DisplayOrder;
        item.IsPublished = dto.IsPublished;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(item);
    }

    public async Task<StoreFaqItemResponseDto> TogglePublishAsync(long storeId, long id)
    {
        var item = await _context.StoreFaqItems
            .FirstOrDefaultAsync(f => f.Id == id && f.StoreId == storeId);

        if (item == null)
            throw new InvalidOperationException("السؤال غير موجود");

        item.IsPublished = !item.IsPublished;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(item);
    }

    public async Task DeleteAsync(long storeId, long id)
    {
        var item = await _context.StoreFaqItems
            .FirstOrDefaultAsync(f => f.Id == id && f.StoreId == storeId);

        if (item == null)
            throw new InvalidOperationException("السؤال غير موجود");

        _context.StoreFaqItems.Remove(item);
        await _context.SaveChangesAsync();
    }

    private static StoreFaqItemResponseDto MapToDto(StoreFaqItem f) => new()
    {
        Id = f.Id,
        QuestionAr = f.QuestionAr,
        QuestionEn = f.QuestionEn,
        AnswerAr = f.AnswerAr,
        AnswerEn = f.AnswerEn,
        DisplayOrder = f.DisplayOrder,
        IsPublished = f.IsPublished
    };
}