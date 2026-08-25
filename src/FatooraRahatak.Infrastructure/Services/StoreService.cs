using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.Common;
using FatooraRahatak.Application.DTOs.Stores;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Data.Seed;
using System.Text.Json;
namespace FatooraRahatak.Infrastructure.Services;
public class StoreService : IStoreService
{
    private static readonly string[] RequiredColorKeys =
        ["headerColor", "buttonColor", "accentColor", "heroFrom", "heroTo", "footerColor", "newsletterColor"];

    private static bool IsValidHexColor(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return false;
        var hex = value.Trim();
        if (!hex.StartsWith('#')) return false;
        hex = hex[1..];
        return (hex.Length == 3 || hex.Length == 6) && hex.All(char.IsAsciiHexDigit);
    }

    private static bool TryValidateColorsJson(string? json, out string? error)
    {
        error = null;
        if (string.IsNullOrWhiteSpace(json))
        {
            error = "colorsJson مطلوب";
            return false;
        }

        try
        {
            using var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;
            if (root.ValueKind != JsonValueKind.Object)
            {
                error = "colorsJson يجب أن يكون JSON بصيغة كائن";
                return false;
            }

            foreach (var key in RequiredColorKeys)
            {
                if (!root.TryGetProperty(key, out var prop))
                {
                    error = $"colorsJson ينقصه المفتاح \"{key}\"";
                    return false;
                }
                if (prop.ValueKind != JsonValueKind.String || !IsValidHexColor(prop.GetString()!))
                {
                    error = $"المفتاح \"{key}\" يجب أن يكون لون hex صحيح";
                    return false;
                }
            }
            return true;
        }
        catch (JsonException)
        {
            error = "colorsJson ليس JSON صحيحًا";
            return false;
        }
    }

    private readonly AppDbContext _context;
    private readonly IDomainService _domainService;
    public StoreService(AppDbContext context, IDomainService domainService)
    {
        _context = context;
        _domainService = domainService;
    }

    private async Task<Store?> ResolveStoreAsync(long userId)
    {
        var ownedStore = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (ownedStore != null) return ownedStore;
        var employee = await _context.Employees.FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");
        if (employee == null) return null;
        return await _context.Stores.FirstOrDefaultAsync(s => s.Id == employee.StoreId);
    }
    public async Task<StoreResponseDto> CreateStoreAsync(long ownerUserId, CreateStoreDto dto)
    {
        var alreadyHasStore = await _context.Stores.AnyAsync(s => s.OwnerUserId == ownerUserId);
        if (alreadyHasStore)
            throw new InvalidOperationException("عندك متجر بالفعل، لا يمكن إنشاء أكتر من متجر لنفس الحساب");

        if (string.IsNullOrWhiteSpace(dto.StoreName))
            throw new InvalidOperationException("يجب إدخال اسم المتجر");

        var slug = dto.StoreSlug?.Trim().ToLowerInvariant() ?? string.Empty;
        if (slug.Length < 3 || slug.Length > 50)
            throw new InvalidOperationException("الرابط الفرعي يجب أن يكون بين 3 و 50 حرفًا");
        if (!System.Text.RegularExpressions.Regex.IsMatch(slug, "^[a-z0-9]+(?:-[a-z0-9]+)*$"))
            throw new InvalidOperationException("الرابط الفرعي يجب أن يحتوي على حروف إنجليزية صغيرة وأرقام وشرطة (-) فقط، بدون مسافات أو رموز خاصة");

        var slugExists = await _context.Stores.AnyAsync(s => s.StoreSlug.ToLower() == slug);
        if (slugExists)
            throw new InvalidOperationException("الرابط الفرعي مستخدم بالفعل، اختر رابط آخر");
        var freePackage = await _context.Packages.FirstOrDefaultAsync(p => p.PackageName == "المجانية");
        if (freePackage == null)
            throw new InvalidOperationException("خطأ في إعدادات الباقات، تواصل مع الدعم الفني");
        var store = new Store
        {
            OwnerUserId = ownerUserId,
            StoreName = dto.StoreName.Trim(),
            StoreSlug = slug,
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
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.BankTransfer, IsEnabled = false },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Mada, IsEnabled = false },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Tabby, IsEnabled = false },
            new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Tamara, IsEnabled = false }
        );
        await _context.SaveChangesAsync();
        // =================================================================================

        await _domainService.AutoCreateSubdomainAsync(store.Id, store.StoreSlug);

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
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null) return null;
        var storeWithPackage = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == store.Id);
        if (storeWithPackage == null) return null;
        store = storeWithPackage;
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
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var package = await _context.Packages.FindAsync(store.PackageId);
        if (package == null || !package.HasCustomDomain)
            throw new InvalidOperationException("الدومين المخصص غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");

        var domain = dto.Domain?.Trim().ToLowerInvariant() ?? string.Empty;
        if (domain.StartsWith("https://")) domain = domain[8..];
        if (domain.StartsWith("http://")) domain = domain[7..];
        domain = domain.TrimEnd('/');

        if (string.IsNullOrWhiteSpace(domain))
            throw new InvalidOperationException("يجب إدخال الدومين");

        // صيغة دومين صحيحة: أحرف وأرقام وشرطة ونقط (بدون مسافات أو رموز غريبة)
        if (!System.Text.RegularExpressions.Regex.IsMatch(domain, @"^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$"))
            throw new InvalidOperationException("صيغة الدومين غير صحيحة");

        // فحص عدم تكرار الدومين على متجر آخر
        var domainExists = await _context.Stores.AnyAsync(s => s.Id != store.Id && s.CustomDomain != null && s.CustomDomain.ToLower() == domain);
        if (domainExists)
            throw new InvalidOperationException("هذا الدومين مستخدم بالفعل من متجر آخر");

        store.CustomDomain = domain;
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
        var store = await ResolveStoreAsync(ownerUserId);
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
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.ContactPhone = dto.ContactPhone;
        store.ContactEmail = dto.ContactEmail;
        store.ContactAddress = dto.ContactAddress;
        store.BranchName = dto.BranchName;
        store.CommercialRegistrationNumber = dto.CommercialRegistrationNumber;
        await _context.SaveChangesAsync();

        return new StoreContactResponseDto
        {
            ContactPhone = store.ContactPhone,
            ContactEmail = store.ContactEmail,
            ContactAddress = store.ContactAddress,
            BranchName = store.BranchName,
            CommercialRegistrationNumber = store.CommercialRegistrationNumber
        };
    }

    public async Task<bool> ToggleStoreOnlineAsync(long ownerUserId)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.IsOnline = !store.IsOnline;
        await _context.SaveChangesAsync();
        return store.IsOnline;
    }

    public async Task<VatRegistrationResponseDto> ToggleVatRegistrationAsync(long ownerUserId)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.IsVatRegistered = !store.IsVatRegistered;
        await _context.SaveChangesAsync();

        return new VatRegistrationResponseDto
        {
            IsVatRegistered = store.IsVatRegistered
        };
    }

    public async Task<StoreInfoDto> UpdateVatNumberAsync(long ownerUserId, string? vatNumber)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.VatNumber = string.IsNullOrWhiteSpace(vatNumber) ? null : vatNumber.Trim();

        // وجود رقم ضريبي يعني أن المتجر مسجّل ضريبيًا — فتفعيل التسجيل تلقائيًا
        // يجعل الضريبة والـ QR يظهران فور إدخال الرقم دون الحاجة لتغيير منفصل.
        if (!string.IsNullOrWhiteSpace(store.VatNumber))
            store.IsVatRegistered = true;

        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> GetStoreInfoAsync(long ownerUserId)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var package = await _context.Packages.FindAsync(store.PackageId);
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
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.BankTransfer, IsEnabled = false },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Mada, IsEnabled = false },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Tabby, IsEnabled = false },
                new StorePaymentMethod { StoreId = store.Id, Type = PaymentMethodType.Tamara, IsEnabled = false }
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
            BranchName = store.BranchName,
            CommercialRegistrationNumber = store.CommercialRegistrationNumber,
            BioLink = store.BioLink,
            FacebookUrl = store.FacebookUrl,
            InstagramUrl = store.InstagramUrl,
            WhatsappUrl = store.WhatsappUrl,
            SnapchatUrl = store.SnapchatUrl,
            TiktokUrl = store.TiktokUrl,
            TelegramUrl = store.TelegramUrl,
            LinkedinUrl = store.LinkedinUrl,
            TwitterUrl = store.TwitterUrl,
            YoutubeUrl = store.YoutubeUrl,
            PinterestUrl = store.PinterestUrl,
            Currency = store.Currency,
            IsVatRegistered = store.IsVatRegistered,
            VatNumber = store.VatNumber,
            ReturnPolicyText = store.ReturnPolicyText,
            IsOnline = store.IsOnline,
            DefaultLanguage = store.DefaultLanguage,
            ThemeName = store.ThemeName,
            ColorsJson = store.ColorsJson,
            Logo = store.Logo,
            Favicon = store.Favicon,
            CoverImage = store.CoverImage,
            CustomCss = store.CustomCss,
            MaxThemes = package?.MaxThemes ?? 1,
            IsSearchEnabled = store.IsSearchEnabled,
            IsReviewsEnabled = store.IsReviewsEnabled,
            LowStockThreshold = store.LowStockThreshold,
            IsCouponsEnabled = store.IsCouponsEnabled,
            CustomerNotificationEmail = store.CustomerNotificationEmail,
            CustomerNotificationWhatsapp = store.CustomerNotificationWhatsapp,
            TrustBadgesJson = store.TrustBadgesJson,
            ReturnPolicyDays = store.ReturnPolicyDays,
            FreeShippingThreshold = store.FreeShippingThreshold,
            ShippingDiscountPercent = store.ShippingDiscountPercent,
            MenuConfigJson = store.MenuConfigJson,
            StorePagesJson = store.StorePagesJson,
            ShippingMethods = shippingMethods,
            PaymentMethods = paymentMethods
        };
    }

    public async Task<List<ShippingMethodDto>> UpdateShippingMethodsAsync(long ownerUserId, UpdateShippingMethodsDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var package = await _context.Packages.FindAsync(store.PackageId);

        var existing = await _context.StoreShippingMethods
            .Where(m => m.StoreId == store.Id)
            .ToListAsync();

        foreach (var item in dto.Methods)
        {
            if (!Enum.TryParse<ShippingMethodType>(item.Type, out var type))
                throw new InvalidOperationException($"طريقة شحن غير معروفة: {item.Type}");

            var method = existing.FirstOrDefault(m => m.Type == type);
            if (method == null)
                throw new InvalidOperationException($"طريقة الشحن \"{item.Type}\" غير موجودة لهذا المتجر");

            // فرض ميزة الباقة: التوصيل للعنوان (DeliveryToAddress) يتطلب تفعيل الشحن في الباقة
            if (type == ShippingMethodType.DeliveryToAddress && item.IsEnabled
                && (package == null || !package.HasShippingIntegration))
            {
                throw new InvalidOperationException("التوصيل للعنوان غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيل الشحن والتوصيل.");
            }

            method.IsEnabled = item.IsEnabled;
        }

        await _context.SaveChangesAsync();

        return existing.Select(m => new ShippingMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled }).ToList();
    }

    public async Task<List<PaymentMethodDto>> UpdatePaymentMethodsAsync(long ownerUserId, UpdatePaymentMethodsDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var package = await _context.Packages.FindAsync(store.PackageId);

        var existing = await _context.StorePaymentMethods
            .Where(m => m.StoreId == store.Id)
            .ToListAsync();

        foreach (var item in dto.Methods)
        {
            if (!Enum.TryParse<PaymentMethodType>(item.Type, out var type))
                throw new InvalidOperationException($"طريقة دفع غير معروفة: {item.Type}");

            var method = existing.FirstOrDefault(m => m.Type == type);
            if (method == null)
                throw new InvalidOperationException($"طريقة الدفع \"{item.Type}\" غير موجودة لهذا المتجر");

            // فرض ميزة الباقة: الدفع عند الاستلام يتطلب تفعيله في الباقة
            if (type == PaymentMethodType.CashOnDelivery && item.IsEnabled
                && (package == null || !package.HasCashOnDelivery))
            {
                throw new InvalidOperationException("الدفع عند الاستلام غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");
            }

            method.IsEnabled = item.IsEnabled;
        }

        // فرض حد الباقة: عدد بوابات الدفع الإلكترونية المفعلة (الكريدت/باي بال/تحويل) لا يتجاوز MaxPaymentGateways
        if (package != null && package.MaxPaymentGateways != PackageLimitHelper.Unlimited)
        {
            var electronicEnabled = existing.Count(m => m.IsEnabled
                && m.Type != PaymentMethodType.CashOnDelivery);

            if (electronicEnabled > package.MaxPaymentGateways)
                throw new InvalidOperationException(
                    $"باقتك الحالية تسمح بتفعيل {package.MaxPaymentGateways} بوابة دفع إلكترونية فقط. قم بترقية باقتك لزيادة الحد.");
        }

        await _context.SaveChangesAsync();

        return existing.Select(m => new PaymentMethodDto { Type = m.Type.ToString(), IsEnabled = m.IsEnabled }).ToList();
    }

    public async Task<StoreSocialResponseDto> UpdateSocialInfoAsync(long ownerUserId, UpdateStoreSocialDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.BioLink = dto.BioLink;
        store.FacebookUrl = dto.FacebookUrl;
        store.InstagramUrl = dto.InstagramUrl;
        store.WhatsappUrl = dto.WhatsappUrl;
        store.SnapchatUrl = dto.SnapchatUrl;
        store.TiktokUrl = dto.TiktokUrl;
        store.TelegramUrl = dto.TelegramUrl;
        store.LinkedinUrl = dto.LinkedinUrl;
        store.TwitterUrl = dto.TwitterUrl;
        store.YoutubeUrl = dto.YoutubeUrl;
        store.PinterestUrl = dto.PinterestUrl;
        await _context.SaveChangesAsync();

        return new StoreSocialResponseDto
        {
            BioLink = store.BioLink,
            FacebookUrl = store.FacebookUrl,
            InstagramUrl = store.InstagramUrl,
            WhatsappUrl = store.WhatsappUrl,
            SnapchatUrl = store.SnapchatUrl,
            TiktokUrl = store.TiktokUrl,
            TelegramUrl = store.TelegramUrl,
                        TwitterUrl = store.TwitterUrl,
            YoutubeUrl = store.YoutubeUrl,
            PinterestUrl = store.PinterestUrl
        };
    }

    public async Task<CurrencyLanguageResponseDto> UpdateCurrencyLanguageAsync(long ownerUserId, UpdateCurrencyLanguageDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
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
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        return new StoreThemeResponseDto
        {
            ThemeName = store.ThemeName,
            ColorsJson = store.ColorsJson,
            CoverImage = store.CoverImage,
            CustomCss = store.CustomCss
        };
    }

    public async Task<StoreThemeResponseDto> UpdateThemeAsync(long ownerUserId, UpdateStoreThemeDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        if (string.IsNullOrWhiteSpace(dto.ThemeName))
            throw new InvalidOperationException("يجب اختيار قالب للمتجر");

        if (!TryValidateColorsJson(dto.ColorsJson, out var colorsError))
            throw new InvalidOperationException(colorsError);

        var package = await _context.Packages.FindAsync(store.PackageId);
        if (package != null && package.MaxThemes != -1)
        {
            var allowedThemes = await _context.Themes
                .Where(t => t.IsEnabled)
                .OrderBy(t => t.DisplayOrder)
                .Take(package.MaxThemes)
                .Select(t => t.ThemeKey)
                .ToListAsync();

            if (!allowedThemes.Contains(dto.ThemeName))
                throw new InvalidOperationException("هذا القالب غير متاح في باقتك الحالية. قم بترقية باقتك لاستخدام المزيد من القوالب.");
        }

        store.ThemeName = dto.ThemeName;
        store.ColorsJson = dto.ColorsJson;
        store.CoverImage = dto.CoverImage;
        if (dto.CustomCss != null)
            store.CustomCss = string.IsNullOrWhiteSpace(dto.CustomCss) ? null : dto.CustomCss;
        await _context.SaveChangesAsync();

        return new StoreThemeResponseDto
        {
            ThemeName = store.ThemeName,
            ColorsJson = store.ColorsJson,
            CoverImage = store.CoverImage,
            CustomCss = store.CustomCss
        };
    }

    public async Task<StoreInfoDto> UpdateStoreSettingsAsync(long ownerUserId, UpdateStoreSettingsDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
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

    public async Task<StoreInfoDto> UpdateLogoAsync(long ownerUserId, UpdateStoreLogoDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        // فرض ميزة الباقة: رفع الشعار يتطلب تفعيل ميزة الشعار في الباقة
        var package = await _context.Packages.FindAsync(store.PackageId);
        if (package == null || !package.HasLogo)
            throw new InvalidOperationException("ميزة رفع شعار المتجر غير متاحة في باقتك الحالية. قم بترقية باقتك لتفعيلها.");

        if (string.IsNullOrWhiteSpace(dto.LogoBase64))
            throw new InvalidOperationException("يجب إرسال الشعار بصيغة Base64");

        var logo = dto.LogoBase64.Trim();
        if (!logo.Contains("base64,", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("شعار غير صالح: يجب أن يكون بيانات صورة بصيغة Base64");

        var prefix = logo[..(logo.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)];
        var data = logo[(logo.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)..];

        if (!prefix.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("شعار غير صالح: الصيغة يجب أن تكون صورة (PNG / JPG / JPEG / WebP / GIF / SVG)");

        if (data.Length > 3 * 1024 * 1024)
            throw new InvalidOperationException("حجم الشعار كبير جدًا (الحد الأقصى 2 ميجابايت)");

        try
        {
            Convert.FromBase64String(data);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("شعار غير صالح: بيانات Base64 غير صحيحة");
        }

        store.Logo = logo;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> DeleteLogoAsync(long ownerUserId)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.Logo = null;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> UpdateFaviconAsync(long ownerUserId, UpdateStoreFaviconDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        var package = await _context.Packages.FindAsync(store.PackageId);
        if (package == null || !package.HasLogo)
            throw new InvalidOperationException("ميزة رفع شعار المتجر غير متاحة في باقتك الحالية. قم بترقية باقتك لتفعيلها.");

        if (string.IsNullOrWhiteSpace(dto.FaviconBase64))
            throw new InvalidOperationException("يجب إرسال الأيقونة بصيغة Base64");

        var favicon = dto.FaviconBase64.Trim();
        if (!favicon.Contains("base64,", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("أيقونة غير صالحة: يجب أن تكون بيانات صورة بصيغة Base64");

        var prefix = favicon[..(favicon.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)];
        var data = favicon[(favicon.IndexOf("base64,", StringComparison.OrdinalIgnoreCase) + 7)..];

        if (!prefix.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("أيقونة غير صالحة: الصيغة يجب أن تكون صورة (PNG / ICO / JPG / WebP / GIF)");

        if (data.Length > 1024 * 1024)
            throw new InvalidOperationException("حجم الأيقونة كبير جدًا (الحد الأقصى 1 ميجابايت)");

        try
        {
            Convert.FromBase64String(data);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("أيقونة غير صالحة: بيانات Base64 غير صحيحة");
        }

        store.Favicon = favicon;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> DeleteFaviconAsync(long ownerUserId)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        store.Favicon = null;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> UpdateShippingDiscountsAsync(long ownerUserId, UpdateShippingDiscountsDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        // فرض ميزة الباقة: خصومات الشحن تتطلب تفعيل الميزة في الباقة
        var package = await _context.Packages.FindAsync(store.PackageId);
        if (package == null || !package.HasShippingDiscounts)
            throw new InvalidOperationException("خصومات الشحن غير متاحة في باقتك الحالية. قم بترقية باقتك لتفعيلها.");

        if (dto.ShippingDiscountPercent is < 0 or > 100)
            throw new InvalidOperationException("نسبة خصم الشحن يجب أن تكون بين 0 و 100");
        if (dto.FreeShippingThreshold is < 0)
            throw new InvalidOperationException("حد الشحن المجاني لا يمكن أن يكون سالبًا");

        store.FreeShippingThreshold = dto.FreeShippingThreshold;
        store.ShippingDiscountPercent = dto.ShippingDiscountPercent;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    public async Task<StoreInfoDto> UpdateMenuPagesAsync(long ownerUserId, UpdateMenuPagesDto dto)
    {
        var store = await ResolveStoreAsync(ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");

        if (!string.IsNullOrWhiteSpace(dto.MenuConfigJson) && !IsValidJsonArray(dto.MenuConfigJson))
            throw new InvalidOperationException("صيغة إعدادات القائمة غير صحيحة");

        if (!string.IsNullOrWhiteSpace(dto.StorePagesJson) && !IsValidJsonArray(dto.StorePagesJson))
            throw new InvalidOperationException("صيغة صفحات المتجر غير صحيحة");

        store.MenuConfigJson = string.IsNullOrWhiteSpace(dto.MenuConfigJson) ? null : dto.MenuConfigJson;
        store.StorePagesJson = string.IsNullOrWhiteSpace(dto.StorePagesJson) ? null : dto.StorePagesJson;
        await _context.SaveChangesAsync();

        return await GetStoreInfoAsync(ownerUserId);
    }

    private static bool IsValidJsonArray(string json)
    {
        try
        {
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.ValueKind == JsonValueKind.Array;
        }
        catch (JsonException)
        {
            return false;
        }
    }
}