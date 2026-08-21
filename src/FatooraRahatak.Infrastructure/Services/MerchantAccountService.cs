using FatooraRahatak.Application.DTOs.Merchant;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Settlement;
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
        ValidateUpsertDto(dto);

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
            || string.IsNullOrWhiteSpace(account.LegalName) || string.IsNullOrWhiteSpace(account.LicenseType)
            || string.IsNullOrWhiteSpace(account.LicenseNumber)
            || string.IsNullOrWhiteSpace(account.OwnerFirstName) || string.IsNullOrWhiteSpace(account.OwnerLastName)
            || string.IsNullOrWhiteSpace(account.OwnerEmail) || string.IsNullOrWhiteSpace(account.OwnerCountryCode)
            || string.IsNullOrWhiteSpace(account.OwnerPhone)
            || string.IsNullOrWhiteSpace(account.AddressCountry) || string.IsNullOrWhiteSpace(account.AddressCity))
            throw new InvalidOperationException("أكمل بيانات حساب التاجر قبل إرساله للمراجعة");

        if (!IsValidHttpUrl(account.WebsiteUrl))
            throw new InvalidOperationException("رابط الموقع الإلكتروني غير صالح. يجب أن يبدأ بـ http:// أو https://");

        if (!IsValidEmail(account.OwnerEmail))
            throw new InvalidOperationException("صيغة البريد الإلكتروني غير صحيحة");

        if (!IsDigitsOnly(account.OwnerPhone))
            throw new InvalidOperationException("رقم الجوال يجب أن يحتوي على أرقام فقط");

        if (account.BirthDate == null)
            throw new InvalidOperationException("تاريخ الميلاد مطلوب");
        else if (CalculateAge(account.BirthDate.Value) < 18)
            throw new InvalidOperationException("يجب أن يكون عمر صاحب الحساب 18 سنة أو أكثر لإرسال الحساب للمراجعة");

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

    public async Task<bool> IsMerchantKycApprovedAsync(long storeId)
    {
        var status = await GetMerchantKycStatusAsync(storeId);
        return status.IsApproved;
    }

    public async Task<MerchantKycStatusDto> GetMerchantKycStatusAsync(long storeId)
    {
        var accountStatus = MerchantAccountStatus.NotSubmitted;
        var account = await _context.MerchantAccounts
            .Where(a => a.StoreId == storeId)
            .Select(a => (MerchantAccountStatus?)a.Status)
            .FirstOrDefaultAsync();
        if (account.HasValue)
            accountStatus = account.Value;

        var verificationStatus = "NotSubmitted";
        var verification = await _context.MerchantVerifications
            .Where(v => v.StoreId == storeId)
            .Select(v => (MerchantVerificationStatus?)v.Status)
            .FirstOrDefaultAsync();
        if (verification.HasValue)
            verificationStatus = verification.Value.ToString();

        return new MerchantKycStatusDto
        {
            StoreId = storeId,
            MerchantAccountStatus = accountStatus.ToString(),
            VerificationStatus = verificationStatus,
            IsApproved = accountStatus == MerchantAccountStatus.Approved
                && string.Equals(verificationStatus, "Approved", StringComparison.OrdinalIgnoreCase)
        };
    }

    private static void ValidateUpsertDto(UpsertMerchantAccountDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.BrandName))
            throw new InvalidOperationException("اسم العلامة التجارية مطلوب");
        if (string.IsNullOrWhiteSpace(dto.WebsiteUrl))
            throw new InvalidOperationException("رابط الموقع الإلكتروني مطلوب");
        else if (!IsValidHttpUrl(dto.WebsiteUrl))
            throw new InvalidOperationException("رابط الموقع الإلكتروني غير صالح. يجب أن يبدأ بـ http:// أو https://");
        if (string.IsNullOrWhiteSpace(dto.LegalName))
            throw new InvalidOperationException("الاسم القانوني مطلوب");
        if (string.IsNullOrWhiteSpace(dto.LicenseType))
            throw new InvalidOperationException("نوع الترخيص مطلوب");
        if (string.IsNullOrWhiteSpace(dto.LicenseNumber))
            throw new InvalidOperationException("رقم الترخيص مطلوب");
        if (string.IsNullOrWhiteSpace(dto.OwnerFirstName))
            throw new InvalidOperationException("الاسم الأول مطلوب");
        if (string.IsNullOrWhiteSpace(dto.OwnerLastName))
            throw new InvalidOperationException("الاسم الأخير مطلوب");
        if (string.IsNullOrWhiteSpace(dto.OwnerEmail))
            throw new InvalidOperationException("البريد الإلكتروني مطلوب");
        else if (!IsValidEmail(dto.OwnerEmail))
            throw new InvalidOperationException("صيغة البريد الإلكتروني غير صحيحة");
        if (string.IsNullOrWhiteSpace(dto.OwnerCountryCode))
            throw new InvalidOperationException("رمز الدولة مطلوب");
        if (string.IsNullOrWhiteSpace(dto.OwnerPhone))
            throw new InvalidOperationException("رقم الجوال مطلوب");
        else if (!IsDigitsOnly(dto.OwnerPhone))
            throw new InvalidOperationException("رقم الجوال يجب أن يحتوي على أرقام فقط");
        if (string.IsNullOrWhiteSpace(dto.AddressCountry))
            throw new InvalidOperationException("دولة العنوان مطلوبة");
        if (string.IsNullOrWhiteSpace(dto.AddressCity))
            throw new InvalidOperationException("مدينة العنوان مطلوبة");
        if (dto.BirthDate == null)
            throw new InvalidOperationException("تاريخ الميلاد مطلوب");
        else if (dto.BirthDate.Value > DateTime.UtcNow)
            throw new InvalidOperationException("تاريخ الميلاد غير صالح");
    }

    private static bool IsValidHttpUrl(string value) =>
        Uri.TryCreate(value.Trim(), UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);

    private static bool IsValidEmail(string value) =>
        !string.IsNullOrWhiteSpace(value)
        && value.Contains('@')
        && value.Contains('.')
        && value.IndexOf('@') > 0
        && value.IndexOf('@') < value.Length - 1
        && value.IndexOf('.') < value.Length - 1;

    private static bool IsDigitsOnly(string value) =>
        !string.IsNullOrWhiteSpace(value) && value.All(char.IsDigit);

    /// <summary>حساب العمر بنفس منطق الواجهة (calcAge).</summary>
    private static int CalculateAge(DateTime birthDate)
    {
        var now = DateTime.UtcNow;
        var age = now.Year - birthDate.Year;
        if (now.Month < birthDate.Month || (now.Month == birthDate.Month && now.Day < birthDate.Day))
            age -= 1;
        return age;
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

    public async Task SuspendAccountAsync(long id, string reason, long adminUserId, string? ipAddress = null)
    {
        var account = await _context.MerchantAccounts
            .Include(a => a.Store)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (account == null)
            throw new InvalidOperationException("الحساب غير موجود");

        account.Status = MerchantAccountStatus.Suspended;
        account.SuspensionReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        account.SuspendedAt = DateTime.UtcNow;
        account.ReviewedAt = DateTime.UtcNow;
        account.ReviewedByUserId = adminUserId;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await LogAuditAndNotifyAsync(adminUserId, account, "merchant_account_suspended",
            "تم إيقاف حساب التاجر",
            $"تم إيقاف حساب التاجر: {account.BrandName}" + (string.IsNullOrWhiteSpace(reason) ? "" : $" ({reason.Trim()})"),
            ipAddress);
    }

    public async Task ReactivateAccountAsync(long id, long adminUserId, string? ipAddress = null)
    {
        var account = await _context.MerchantAccounts
            .Include(a => a.Store)
            .FirstOrDefaultAsync(a => a.Id == id);
        if (account == null)
            throw new InvalidOperationException("الحساب غير موجود");

        account.Status = MerchantAccountStatus.Approved;
        account.SuspensionReason = null;
        account.SuspendedAt = null;
        account.ReviewedAt = DateTime.UtcNow;
        account.ReviewedByUserId = adminUserId;
        account.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await LogAuditAndNotifyAsync(adminUserId, account, "merchant_account_reactivated",
            "تم إعادة تفعيل حساب التاجر",
            $"تم إعادة تفعيل حساب التاجر: {account.BrandName}",
            ipAddress);
    }

    private async Task LogAuditAndNotifyAsync(long adminUserId, MerchantAccount account, string action, string titleAr, string messageAr, string? ipAddress)
    {
        var adminName = await _context.Users
            .Where(u => u.Id == adminUserId)
            .Select(u => u.FullName ?? u.Email)
            .FirstOrDefaultAsync() ?? "admin";

        _context.Set<FatooraRahatak.Domain.Entities.Audit.AuditLog>().Add(new FatooraRahatak.Domain.Entities.Audit.AuditLog
        {
            AdminUserId = adminUserId,
            AdminName = adminName,
            Action = action,
            TargetType = nameof(MerchantAccount),
            TargetId = account.Id.ToString(),
            Details = messageAr,
            IpAddress = ipAddress
        });

        if (account.Store?.OwnerUserId is long ownerId && ownerId > 0)
        {
            _context.Set<FatooraRahatak.Domain.Entities.Notifications.Notification>().Add(
                new FatooraRahatak.Domain.Entities.Notifications.Notification
                {
                    UserId = ownerId,
                    TitleAr = titleAr,
                    MessageAr = messageAr,
                    Type = FatooraRahatak.Domain.Enums.NotificationType.General,
                    Link = "/dashboard/merchant-account"
                });
        }

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
            SuspensionReason = a.SuspensionReason,
            SuspendedAt = a.SuspendedAt,
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
        SuspensionReason = a.SuspensionReason,
        SuspendedAt = a.SuspendedAt,
    };
}