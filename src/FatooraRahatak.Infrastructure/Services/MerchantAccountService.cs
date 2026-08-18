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

        // تعديل البيانات يعيد الحساب إلى مسودة لإعادة المراجعة
        account.IsSubmitted = false;
        account.Status = MerchantAccountStatus.NotSubmitted;
        account.RejectionReason = null;
        account.ReviewedAt = null;
        account.ReviewedByUserId = null;

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

        if (account.Status == MerchantAccountStatus.Pending)
            throw new InvalidOperationException("حساب التاجر قيد المراجعة بالفعل");
        if (account.Status == MerchantAccountStatus.Approved)
            throw new InvalidOperationException("تم اعتماد حساب التاجر مسبقًا");

        if (string.IsNullOrWhiteSpace(account.BrandName) || string.IsNullOrWhiteSpace(account.WebsiteUrl)
            || string.IsNullOrWhiteSpace(account.LegalName) || string.IsNullOrWhiteSpace(account.LicenseNumber)
            || string.IsNullOrWhiteSpace(account.OwnerFirstName) || string.IsNullOrWhiteSpace(account.OwnerLastName)
            || string.IsNullOrWhiteSpace(account.OwnerEmail) || string.IsNullOrWhiteSpace(account.OwnerPhone)
            || string.IsNullOrWhiteSpace(account.AddressCountry) || string.IsNullOrWhiteSpace(account.AddressCity))
            throw new InvalidOperationException("أكمل بيانات حساب التاجر قبل إرساله للمراجعة");

        account.IsSubmitted = true;
        account.Status = MerchantAccountStatus.Pending;
        account.SubmittedAt = DateTime.UtcNow;
        account.RejectionReason = null;
        account.ReviewedAt = null;
        account.ReviewedByUserId = null;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return ToDto(account);
    }

    public async Task<List<AdminMerchantAccountDto>> GetAllAccountsAsync(string? status = null)
    {
        var query = _context.MerchantAccounts
            .Include(a => a.Store)
            .ThenInclude(s => s.Owner)
            .Include(a => a.ReviewedBy)
            .OrderByDescending(a => a.CreatedAt);

        var list = await query.ToListAsync();

        if (!string.IsNullOrWhiteSpace(status))
            list = list
                .Where(a => a.Status.ToString().Equals(status, StringComparison.OrdinalIgnoreCase))
                .ToList();

        return list.Select(MapAdmin).ToList();
    }

    public async Task<AdminMerchantAccountDto?> GetAdminAccountAsync(long id)
    {
        var account = await _context.MerchantAccounts
            .Include(a => a.Store)
            .ThenInclude(s => s.Owner)
            .Include(a => a.ReviewedBy)
            .FirstOrDefaultAsync(a => a.Id == id);
        return account == null ? null : MapAdmin(account);
    }

    public async Task ProcessAccountReviewAsync(long id, ReviewMerchantAccountDto dto, long adminUserId)
    {
        var account = await _context.MerchantAccounts.FindAsync(id);
        if (account == null)
            throw new InvalidOperationException("حساب التاجر غير موجود");
        if (account.Status != MerchantAccountStatus.Pending)
            throw new InvalidOperationException("هذا الطلب لم يعد قيد المراجعة");

        account.Status = dto.Approve ? MerchantAccountStatus.Approved : MerchantAccountStatus.Rejected;
        account.RejectionReason = dto.Approve ? null : dto.RejectionReason;
        account.ReviewedAt = DateTime.UtcNow;
        account.ReviewedByUserId = adminUserId;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }

    private static AdminMerchantAccountDto MapAdmin(MerchantAccount a)
    {
        var ownerFullName = string.Join(" ", new[]
        {
            a.OwnerFirstName, a.OwnerMiddleName, a.OwnerLastName
        }.Where(x => !string.IsNullOrWhiteSpace(x)));

        return new AdminMerchantAccountDto
        {
            Id = a.Id,
            StoreId = a.StoreId,
            StoreName = a.Store.StoreName,
            StoreSlug = a.Store.StoreSlug,
            OwnerName = a.Store.Owner?.FullName ?? "",
            OwnerEmail = a.Store.Owner?.Email ?? "",
            BrandName = a.BrandName,
            WebsiteUrl = a.WebsiteUrl,
            LogoPath = a.LogoPath,
            LegalName = a.LegalName,
            LicenseType = a.LicenseType,
            LicenseNumber = a.LicenseNumber,
            OwnerFirstName = a.OwnerFirstName,
            OwnerMiddleName = a.OwnerMiddleName,
            OwnerLastName = a.OwnerLastName,
            OwnerCountryCode = a.OwnerCountryCode,
            OwnerPhone = a.OwnerPhone,
            AddressCountry = a.AddressCountry,
            AddressCity = a.AddressCity,
            BirthDate = a.BirthDate,
            NationalIdNumber = a.NationalIdNumber,
            Status = a.Status.ToString(),
            RejectionReason = a.RejectionReason,
            SubmittedAt = a.SubmittedAt,
            ReviewedAt = a.ReviewedAt,
            ReviewedByName = a.ReviewedBy?.FullName,
        };
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
        Status = a.Status.ToString(),
        RejectionReason = a.RejectionReason,
        ReviewedAt = a.ReviewedAt,
        ReviewedByName = a.ReviewedBy?.FullName,
    };
}