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
            CreatedAt = store.CreatedAt,
            IsOnline = store.IsOnline
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
            CreatedAt = store.CreatedAt,
            CustomDomain = store.CustomDomain,
            CustomDomainStatus = store.CustomDomainStatus.ToString(),
            IsOnline = store.IsOnline
        };
    }
    public async Task<CustomDomainResponseDto> UpdateCustomDomainAsync(long ownerUserId, UpdateCustomDomainDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");
        if (string.IsNullOrWhiteSpace(dto.Domain))
            throw new InvalidOperationException("يجب إدخال الدومين");
        store.CustomDomain = dto.Domain.Trim();
        store.CustomDomainStatus = CustomDomainStatus.Pending;
        await _context.SaveChangesAsync();
        return new CustomDomainResponseDto
        {
            CustomDomain = store.CustomDomain,
            CustomDomainStatus = store.CustomDomainStatus.ToString()
        };
    }

    public async Task<ReturnPolicyResponseDto> UpdateReturnPolicyAsync(long ownerUserId, UpdateReturnPolicyDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.ReturnPolicyText = dto.ReturnPolicyText;
        await _context.SaveChangesAsync();

        return new ReturnPolicyResponseDto
        {
            ReturnPolicyText = store.ReturnPolicyText
        };
    }

    public async Task<StoreContactResponseDto> UpdateContactAsync(long ownerUserId, UpdateStoreContactDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.ContactPhone = dto.ContactPhone;
        store.ContactEmail = dto.ContactEmail;
        store.ContactAddress = dto.ContactAddress;
        await _context.SaveChangesAsync();

        return new StoreContactResponseDto
        {
            ContactPhone = store.ContactPhone,
            ContactEmail = store.ContactEmail,
            ContactAddress = store.ContactAddress
        };
    }

    public async Task<bool> ToggleStoreOnlineAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.IsOnline = !store.IsOnline;
        await _context.SaveChangesAsync();
        return store.IsOnline;
    }
}