using FatooraRahatak.Application.DTOs.Merchant;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace FatooraRahatak.Infrastructure.Services;

public class MerchantAccountService : IMerchantAccountService
{
    private readonly AppDbContext _context;

    public MerchantAccountService(AppDbContext context) { _context = context; }

    public async Task<MerchantAccountDto?> GetByStoreAsync(long storeId)
    {
        var account = await _context.MerchantAccounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId);
        return account == null ? null : ToDto(account);
    }

    public async Task<MerchantAccountDto> UpsertAsync(long storeId, UpsertMerchantAccountDto dto)
    {
        var account = await _context.MerchantAccounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId);

        if (account == null)
        {
            account = new MerchantAccount { StoreId = storeId };
            _context.MerchantAccounts.Add(account);
        }

        account.BrandName = dto.BrandName.Trim();
        account.WebsiteUrl = dto.WebsiteUrl.Trim();
        account.LegalName = dto.LegalName.Trim();
        account.LicenseType = dto.LicenseType;
        account.LicenseNumber = dto.LicenseNumber.Trim();
        account.OwnerFirstName = dto.OwnerFirstName.Trim();
        account.OwnerMiddleName = string.IsNullOrWhiteSpace(dto.OwnerMiddleName) ? null : dto.OwnerMiddleName.Trim();
        account.OwnerLastName = dto.OwnerLastName.Trim();
        account.OwnerEmail = dto.OwnerEmail.Trim();
        account.OwnerCountryCode = dto.OwnerCountryCode.Trim();
        account.OwnerPhone = dto.OwnerPhone.Trim();
        account.AddressCountry = dto.AddressCountry.Trim();
        account.AddressCity = dto.AddressCity.Trim();
        account.BirthDate = dto.BirthDate;
        account.NationalIdNumber = string.IsNullOrWhiteSpace(dto.NationalIdNumber) ? null : dto.NationalIdNumber.Trim();
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ToDto(account);
    }

    public async Task<MerchantAccountDto> UpdateLogoAsync(long storeId, string logoPath)
    {
        var account = await _context.MerchantAccounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId);

        if (account == null)
        {
            account = new MerchantAccount { StoreId = storeId };
            _context.MerchantAccounts.Add(account);
        }

        account.LogoPath = logoPath;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ToDto(account);
    }

    public async Task<MerchantAccountDto> MarkSubmittedAsync(long storeId)
    {
        var account = await _context.MerchantAccounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId)
            ?? throw new InvalidOperationException("حساب التاجر غير موجود");

        account.IsSubmitted = true;
        account.SubmittedAt = DateTime.UtcNow;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ToDto(account);
    }

    private static MerchantAccountDto ToDto(MerchantAccount a) => new()
    {
        Id = a.Id,
        StoreId = a.StoreId,
        BrandName = a.BrandName,
        WebsiteUrl = a.WebsiteUrl,
        LogoPath = a.LogoPath,
        LegalName = a.LegalName,
        LicenseType = a.LicenseType,
        LicenseNumber = a.LicenseNumber,
        OwnerFirstName = a.OwnerFirstName,
        OwnerMiddleName = a.OwnerMiddleName,
        OwnerLastName = a.OwnerLastName,
        OwnerEmail = a.OwnerEmail,
        OwnerCountryCode = a.OwnerCountryCode,
        OwnerPhone = a.OwnerPhone,
        AddressCountry = a.AddressCountry,
        AddressCity = a.AddressCity,
        BirthDate = a.BirthDate,
        NationalIdNumber = a.NationalIdNumber,
        IsSubmitted = a.IsSubmitted,
        SubmittedAt = a.SubmittedAt,
    };
}