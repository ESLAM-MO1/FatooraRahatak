using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class CategoryService : ICategoryService
{
    private readonly AppDbContext _context;

    public CategoryService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryResponseDto> CreateAsync(long storeId, CreateCategoryDto dto)
    {
        if (dto.ParentCategoryId.HasValue)
        {
            var parentExists = await _context.Categories
                .AnyAsync(c => c.Id == dto.ParentCategoryId.Value && c.StoreId == storeId);
            if (!parentExists)
                throw new InvalidOperationException("التصنيف الرئيسي غير موجود");
        }

        var category = new Category
        {
            StoreId = storeId,
            ParentCategoryId = dto.ParentCategoryId,
            NameAr = dto.NameAr,
            NameEn = dto.NameEn,
            SortOrder = dto.SortOrder,
            IsActive = true
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        return MapToDto(category);
    }

    public async Task<List<CategoryResponseDto>> GetAllAsync(long storeId)
    {
        return await _context.Categories
            .Where(c => c.StoreId == storeId)
            .OrderBy(c => c.SortOrder)
            .Select(c => new CategoryResponseDto
            {
                Id = c.Id,
                ParentCategoryId = c.ParentCategoryId,
                NameAr = c.NameAr,
                NameEn = c.NameEn,
                IsActive = c.IsActive,
                SortOrder = c.SortOrder
            })
            .ToListAsync();
    }

    public async Task<CategoryResponseDto?> GetByIdAsync(long storeId, long categoryId)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.StoreId == storeId);

        return category == null ? null : MapToDto(category);
    }

    public async Task<CategoryResponseDto> UpdateAsync(long storeId, long categoryId, CreateCategoryDto dto)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.StoreId == storeId);

        if (category == null)
            throw new InvalidOperationException("التصنيف غير موجود");

        category.NameAr = dto.NameAr;
        category.NameEn = dto.NameEn;
        category.ParentCategoryId = dto.ParentCategoryId;
        category.SortOrder = dto.SortOrder;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapToDto(category);
    }

    public async Task DeleteAsync(long storeId, long categoryId)
    {
        var category = await _context.Categories
            .FirstOrDefaultAsync(c => c.Id == categoryId && c.StoreId == storeId);

        if (category == null)
            throw new InvalidOperationException("التصنيف غير موجود");

        var hasProducts = await _context.Products.AnyAsync(p => p.CategoryId == categoryId);
        if (hasProducts)
            throw new InvalidOperationException("لا يمكن حذف تصنيف مرتبط بمنتجات");

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync();
    }

    private static CategoryResponseDto MapToDto(Category c) => new()
    {
        Id = c.Id,
        ParentCategoryId = c.ParentCategoryId,
        NameAr = c.NameAr,
        NameEn = c.NameEn,
        IsActive = c.IsActive,
        SortOrder = c.SortOrder
    };
}