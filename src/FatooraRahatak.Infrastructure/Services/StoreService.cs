using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Data.Seed;
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

        // ===== معلم 3 - تاسك 1: توليد القالب الافتراضي لشجرة الحسابات لكل متجر جديد =====
        var defaultAccounts = DefaultChartOfAccounts.Build(store.Id);
        _context.Accounts.AddRange(defaultAccounts);
        await _context.SaveChangesAsync();
        // =================================================================================

        // ===== معلم 6 - تاسك 5: توليد خيارات الشحن والدفع الافتراضية لكل متجر جديد =====
        _context.StoreShippingMethods.AddRange(
            new StoreShippingMethod { StoreId = store.Id, Type = ShippingMethodType.PickupFromStore, IsEnabled = false },
            new StoreShippingMethod { StoreId = store.Id, Type = ShippingMethodType.DeliveryToAddress, IsEnabled = false }
        );

        _context.StorePaymentMethods.AddRange(
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.CashOnDelivery, IsEnabled = true },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.CreditCard, IsEnabled = false },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.PayPal, IsEnabled = false },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.BankTransfer, IsEnabled = false }
        );
        await _context.SaveChangesAsync();
        // =================================================================================

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
            IsVatRegistered = store.IsVatRegistered,
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

    public async Task<VatRegistrationResponseDto> ToggleVatRegistrationAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.IsVatRegistered = !store.IsVatRegistered;
        await _context.SaveChangesAsync();

        return new VatRegistrationResponseDto
        {
            IsVatRegistered = store.IsVatRegistered
        };
    }

    public async Task<StoreInfoDto> GetStoreInfoAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var hasShipping = await _context.StoreShippingMethods.AnyAsync(m => m.StoreId == store.Id);
        if (!hasShipping)
        {
            _context.StoreShippingMethods.AddRange(
                new StoreShippingMethod { StoreId = store.Id, Type = ShippingMethodType.PickupFromStore, IsEnabled = false },
                new StoreShippingMethod { StoreId = store.Id, Type = ShippingMethodType.DeliveryToAddress, IsEnabled = false }
            );
        }

        var hasPayment = await _context.StorePaymentMethods.AnyAsync(m => m.StoreId == store.Id);
        if (!hasPayment)
        {
            _context.StorePaymentMethods.AddRange(
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.CashOnDelivery, IsEnabled = true },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.CreditCard, IsEnabled = false },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.PayPal, IsEnabled = false },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.BankTransfer, IsEnabled = false }
            );
        }

        if (!hasShipping || !hasPayment)
            await _context.SaveChangesAsync();

        var shippingMethods = await _context.StoreShippingMethods
            .Where(m => m.StoreId == store.Id)
            .Select(m => new ShippingMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled })
            .ToListAsync();

        var paymentMethods = await _context.StorePaymentMethods
            .Where(m => m.StoreId == store.Id)
            .Select(m => new PaymentMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled })
            .ToListAsync();

        return new StoreInfoDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            CustomDomain = store.CustomDomain,
            CustomDomainStatus = store.CustomDomainStatus.ToString(),
            ContactPhone = store.ContactPhone,
            ContactEmail = store.ContactEmail,
            ContactAddress = store.ContactAddress,
            BioLink = store.BioLink,
            FacebookUrl = store.FacebookUrl,
            InstagramUrl = store.InstagramUrl,
            WhatsappUrl = store.WhatsappUrl,
            Currency = store.Currency,
            IsVatRegistered = store.IsVatRegistered,
            VatNumber = store.VatNumber,
            ReturnPolicyText = store.ReturnPolicyText,
            IsOnline = store.IsOnline,
            DefaultLanguage = store.DefaultLanguage,
            ThemeName = store.ThemeName,
            PrimaryColor = store.PrimaryColor,
            CoverImage = store.CoverImage,
            IsSearchEnabled = store.IsSearchEnabled,
            IsReviewsEnabled = store.IsReviewsEnabled,
            LowStockThreshold = store.LowStockThreshold,
            IsCouponsEnabled = store.IsCouponsEnabled,
            CustomerNotificationEmail = store.CustomerNotificationEmail,
            CustomerNotificationWhatsapp = store.CustomerNotificationWhatsapp,
            TrustBadgesJson = store.TrustBadgesJson,
            ReturnPolicyDays = store.ReturnPolicyDays,
            ShippingMethods = shippingMethods,
            PaymentMethods = paymentMethods
        };
    }

    public async Task<List<ShippingMethodDto>> UpdateShippingMethodsAsync(long ownerUserId, UpdateShippingMethodsDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var existing = await _context.StoreShippingMethods
            .Where(m => m.StoreId == store.Id)
            .ToListAsync();

        foreach (var item in dto.Methods)
        {
            if (!Enum.TryParse<ShippingMethodType>(item.Type, out var type))
                continue;
            var method = existing.FirstOrDefault(m => m.Type == type);
            if (method != null)
                method.IsEnabled = item.IsEnabled;
        }

        await _context.SaveChangesAsync();

        return existing.Select(m => new ShippingMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled }).ToList();
    }

    public async Task<List<PaymentMethodDto>> UpdatePaymentMethodsAsync(long ownerUserId, UpdatePaymentMethodsDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var existing = await _context.StorePaymentMethods
            .Where(m => m.StoreId == store.Id)
            .ToListAsync();

        foreach (var item in dto.Methods)
        {
            if (!Enum.TryParse<PaymentMethodType>(item.Type, out var type))
                continue;
            var method = existing.FirstOrDefault(m => m.Type == type);
            if (method != null)
                method.IsEnabled = item.IsEnabled;
        }

        await _context.SaveChangesAsync();

        return existing.Select(m => new PaymentMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled }).ToList();
    }

    public async Task<StoreSocialResponseDto> UpdateSocialInfoAsync(long ownerUserId, UpdateStoreSocialDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.BioLink = dto.BioLink;
        store.FacebookUrl = dto.FacebookUrl;
        store.InstagramUrl = dto.InstagramUrl;
        store.WhatsappUrl = dto.WhatsappUrl;
        await _context.SaveChangesAsync();

        return new StoreSocialResponseDto
        {
            BioLink = store.BioLink,
            FacebookUrl = store.FacebookUrl,
            InstagramUrl = store.InstagramUrl,
            WhatsappUrl = store.WhatsappUrl
        };
    }

    public async Task<CurrencyLanguageResponseDto> UpdateCurrencyLanguageAsync(long ownerUserId, UpdateCurrencyLanguageDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        if (string.IsNullOrWhiteSpace(dto.Currency))
            throw new InvalidOperationException("يجب اختيار عملة المتجر");
        if (string.IsNullOrWhiteSpace(dto.Language))
            throw new InvalidOperationException("يجب اختيار لغة المتجر");

        store.Currency = dto.Currency.Trim();
        store.DefaultLanguage = dto.Language.Trim();
        await _context.SaveChangesAsync();

        return new CurrencyLanguageResponseDto
        {
            Currency = store.Currency,
            Language = store.DefaultLanguage
        };
    }

    public async Task<StoreThemeResponseDto> GetThemeAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        return new StoreThemeResponseDto
        {
            ThemeName = store.ThemeName,
            PrimaryColor = store.PrimaryColor,
            CoverImage = store.CoverImage
        };
    }

    public async Task<StoreThemeResponseDto> UpdateThemeAsync(long ownerUserId, UpdateStoreThemeDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        if (string.IsNullOrWhiteSpace(dto.ThemeName))
            throw new InvalidOperationException("يجب اختيار قالب للمتجر");
        if (string.IsNullOrWhiteSpace(dto.PrimaryColor))
            throw new InvalidOperationException("يجب اختيار لون أساسي للمتجر");

        store.ThemeName = dto.ThemeName;
        store.PrimaryColor = dto.PrimaryColor;
        store.CoverImage = dto.CoverImage;
        await _context.SaveChangesAsync();

        return new StoreThemeResponseDto
        {
            ThemeName = store.ThemeName,
            PrimaryColor = store.PrimaryColor,
            CoverImage = store.CoverImage
        };
    }

    public async Task<StoreInfoDto> UpdateStoreSettingsAsync(long ownerUserId, UpdateStoreSettingsDto dto)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.IsSearchEnabled = dto.IsSearchEnabled;
        store.IsReviewsEnabled = dto.IsReviewsEnabled;
        store.LowStockThreshold = dto.LowStockThreshold;
        store.IsCouponsEnabled = dto.IsCouponsEnabled;
        store.CustomerNotificationEmail = dto.CustomerNotificationEmail;
        store.CustomerNotificationWhatsapp = dto.CustomerNotificationWhatsapp;
        store.TrustBadgesJson = dto.TrustBadgesJson;
        store.ReturnPolicyDays = dto.ReturnPolicyDays;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }
}