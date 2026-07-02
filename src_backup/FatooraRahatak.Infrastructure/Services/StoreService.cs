using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class StoreService : IStoreService
{
    private readonly AppDbContext _context;

    public StoreService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<StoreResponseDto> CreateStoreAsync(long ownerUserId, CreateStoreDto dto)
    {
        var alreadyHasStore = await _context.Stores.AnyAsync(s => s.OwnerUserId == ownerUserId);
        if (alreadyHasStore)
            throw new InvalidOperationException("عندك متجر بالفعل، لا يمكن إنشاء أكتر من متجر لنفس الحساب");

        var slugExists = await _context.Stores.AnyAsync(s => s.StoreSlug == dto.StoreSlug);
        if (slugExists)
            throw new InvalidOperationException("الرابط الفرعي مستخدم بالفعل، اختر رابط آخر");

        // الباقة المجانية هي الافتراضية عند إنشاء أي متجر جديد
        var freePackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == "المجانية");
        if (freePackage == null)
            throw new InvalidOperationException("خطأ في إعدادات الباقات، تواصل مع الدعم الفني");

        var store = new Store
        {
            OwnerUserId = ownerUserId,
            StoreName = dto.StoreName,
            StoreSlug = dto.StoreSlug,
            DefaultLanguage = dto.DefaultLanguage,
            Status = StoreStatus.Active,
            PackageId = freePackage.Id,
            BillingCycleDate = DateTime.UtcNow
        };

        _context.Stores.Add(store);
        await _context.SaveChangesAsync();

        // إنشاء مستودع افتراضي تلقائيًا مع المتجر
        var defaultWarehouse = new Warehouse
        {
            StoreId = store.Id,
            WarehouseName = "المستودع الرئيسي",
            IsDefault = true,
            IsActive = true
        };
        _context.Warehouses.Add(defaultWarehouse);
        await _context.SaveChangesAsync();

        return new StoreResponseDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            Status = store.Status.ToString(),
            PackageName = freePackage.PackageName,
            CreatedAt = store.CreatedAt
        };
    }

    public async Task<StoreResponseDto?> GetMyStoreAsync(long ownerUserId)
    {
        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);

        if (store == null) return null;

        return new StoreResponseDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            Status = store.Status.ToString(),
            PackageName = store.Package.PackageName,
            CreatedAt = store.CreatedAt
        };
    }
}