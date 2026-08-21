using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using FatooraRahatak.Application.DTOs.Public;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class PublicStoreService : IPublicStoreService
{
    private readonly AppDbContext _context;

    public PublicStoreService(AppDbContext context)
    {
        _context = context;
    }

    private async Task<Domain.Entities.Stores.Store?> GetActiveStoreBySlugAsync(string slug)
    {
        return await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active);
    }

    private async Task<Domain.Entities.Stores.Store?> GetOnlineStoreBySlugAsync(string slug)
    {
        return await _context.Stores
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active && s.IsOnline);
    }

    public async Task<PublicStoreDto?> GetStoreBySlugAsync(string slug)
    {
        var store = await GetActiveStoreBySlugAsync(slug);
        if (store == null) return null;

        var shippingMethods = await _context.StoreShippingMethods
            .Where(m => m.StoreId == store.Id && m.IsEnabled)
            .Select(m => new PublicShippingMethodDto { Type = m.Type.ToString() })
            .ToListAsync();

        var paymentMethods = await _context.StorePaymentMethods
            .Where(m => m.StoreId == store.Id && m.IsEnabled)
            .Select(m => new PublicPaymentMethodDto { Type = m.Type.ToString() })
            .ToListAsync();

        var shippingCompanies = await _context.ShippingCompanies
            .Where(c => c.StoreId == store.Id && c.Enabled)
            .OrderBy(c => c.IsDefault ? 0 : 1)
            .ThenBy(c => c.Name)
            .Select(c => new PublicShippingCompanyDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code.ToString(),
                IsDefault = c.IsDefault
            })
            .ToListAsync();

        var trustBadges = ParseTrustBadges(store.TrustBadgesJson);

        return new PublicStoreDto
        {
            Id = store.Id,
            StoreName = store.StoreName,
            StoreSlug = store.StoreSlug,
            Logo = store.Logo,
            DefaultLanguage = store.DefaultLanguage,
            IsOnline = store.IsOnline,
            ThemeName = store.ThemeName,
            ColorsJson = store.ColorsJson,
            CoverImage = store.CoverImage,
            CustomCss = store.CustomCss,
            Currency = store.Currency,
            VatRate = store.IsVatRegistered ? 0.15m : 0,
            FreeShippingThreshold = store.FreeShippingThreshold,
            ContactPhone = store.ContactPhone,
            ContactEmail = store.ContactEmail,
            ContactAddress = store.ContactAddress,
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
            ReturnPolicyText = store.ReturnPolicyText,
            MenuConfigJson = store.MenuConfigJson,
            StorePagesJson = store.StorePagesJson,
            IsCouponsEnabled = store.IsCouponsEnabled,
            IsSearchEnabled = store.IsSearchEnabled,
            IsReviewsEnabled = store.IsReviewsEnabled,
            CustomerNotificationEmail = store.CustomerNotificationEmail,
            CustomerNotificationWhatsapp = store.CustomerNotificationWhatsapp,
            IsCardPaymentsEnabled = paymentMethods.Any(m => m.Type == PaymentMethodType.CreditCard.ToString()),
            TrustBadges = trustBadges,
            ShippingMethods = shippingMethods,
            PaymentMethods = paymentMethods,
            ShippingCompanies = shippingCompanies
        };
    }

    private static List<PublicTrustBadgeDto> ParseTrustBadges(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new List<PublicTrustBadgeDto>();

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var badges = JsonSerializer.Deserialize<List<PublicTrustBadgeDto>>(json, options);
            return badges ?? new List<PublicTrustBadgeDto>();
        }
        catch
        {
            return new List<PublicTrustBadgeDto>();
        }
    }

    public async Task<List<PublicCategoryDto>?> GetCategoriesAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return await _context.Categories
            .Where(c => c.StoreId == store.Id && c.IsActive)
            .OrderBy(c => c.SortOrder)
            .Select(c => new PublicCategoryDto
            {
                Id = c.Id,
                NameAr = c.NameAr,
                NameEn = c.NameEn,
                Image = c.Image,
                ParentCategoryId = c.ParentCategoryId
            })
            .ToListAsync();
    }

    public async Task<List<PublicProductDto>?> GetProductsAsync(string slug, long? categoryId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var query = _context.Products
            .Include(p => p.Images)
            .Where(p => p.StoreId == store.Id && p.Status == ProductStatus.Active);

        if (categoryId.HasValue)
        {
            query = query.Where(p => p.CategoryId == categoryId.Value);
        }

        var products = await query.ToListAsync();
        var productIds = products.Select(p => p.Id).ToList();

        var activeWarehouseIds = await _context.Warehouses
            .Where(w => w.StoreId == store.Id && w.IsActive)
            .Select(w => w.Id)
            .ToListAsync();

        var quantities = await _context.InventoryStocks
            .Where(i => productIds.Contains(i.ProductId) && activeWarehouseIds.Contains(i.WarehouseId))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Total = g.Sum(x => x.QuantityAvailable) })
            .ToListAsync();

        var quantityMap = quantities.ToDictionary(q => q.ProductId, q => q.Total);

        var ratings = await _context.ProductReviews
            .Where(r => r.StoreId == store.Id && productIds.Contains(r.ProductId) && r.IsApproved)
            .GroupBy(r => r.ProductId)
            .Select(g => new { ProductId = g.Key, Avg = g.Average(x => (double)x.Rating), Count = g.Count() })
            .ToListAsync();

        var ratingMap = ratings.ToDictionary(r => r.ProductId);

        return products
            // إخفاء المنتجات غير المتاحة للبيع (الكمية صفر أو بدون مخزون) من الواجهة العامة
            .Where(p => quantityMap.TryGetValue(p.Id, out var qty) && qty > 0)
            .Select(p =>
            {
                ratingMap.TryGetValue(p.Id, out var rating);
                return new PublicProductDto
                {
                    Id = p.Id,
                    CategoryId = p.CategoryId,
                    NameAr = p.NameAr,
                    NameEn = p.NameEn,
                    BasePrice = p.BasePrice,
                    DiscountPrice = p.DiscountPrice,
                    Sku = p.Sku,
                    AvailableQuantity = quantityMap[p.Id],
                    AverageRating = rating?.Avg ?? 0,
                    RatingCount = rating?.Count ?? 0,
                    PrimaryImageUrl = p.Images
                        .OrderByDescending(i => i.IsPrimary)
                        .ThenBy(i => i.SortOrder)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault()
                };
            }).ToList();
    }

    public async Task<List<PublicProductDto>?> GetRelatedProductsAsync(string slug, long productId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var product = await _context.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == store.Id && p.Status == ProductStatus.Active);
        if (product == null) return null;

        var related = await _context.Products
            .Include(p => p.Images)
            .Where(p => p.StoreId == store.Id
                        && p.Id != productId
                        && p.Status == ProductStatus.Active
                        && p.CategoryId == product.CategoryId)
            .Take(8)
            .ToListAsync();

        var relatedIds = related.Select(p => p.Id).ToList();
        var activeWarehouseIds = await _context.Warehouses
            .Where(w => w.StoreId == store.Id && w.IsActive)
            .Select(w => w.Id)
            .ToListAsync();

        var quantities = await _context.InventoryStocks
            .Where(i => relatedIds.Contains(i.ProductId) && activeWarehouseIds.Contains(i.WarehouseId))
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Total = g.Sum(x => x.QuantityAvailable) })
            .ToListAsync();

        var quantityMap = quantities.ToDictionary(q => q.ProductId, q => q.Total);

        var ratings = await _context.ProductReviews
            .Where(r => r.StoreId == store.Id && relatedIds.Contains(r.ProductId) && r.IsApproved)
            .GroupBy(r => r.ProductId)
            .Select(g => new { ProductId = g.Key, Avg = g.Average(x => (double)x.Rating), Count = g.Count() })
            .ToListAsync();

        var ratingMap = ratings.ToDictionary(r => r.ProductId);

        return related
            .Where(p => quantityMap.TryGetValue(p.Id, out var qty) && qty > 0)
            .Select(p =>
            {
                ratingMap.TryGetValue(p.Id, out var rating);
                return new PublicProductDto
                {
                    Id = p.Id,
                    CategoryId = p.CategoryId,
                    NameAr = p.NameAr,
                    NameEn = p.NameEn,
                    BasePrice = p.BasePrice,
                    DiscountPrice = p.DiscountPrice,
                    Sku = p.Sku,
                    AvailableQuantity = quantityMap[p.Id],
                    AverageRating = rating?.Avg ?? 0,
                    RatingCount = rating?.Count ?? 0,
                    PrimaryImageUrl = p.Images
                        .OrderByDescending(i => i.IsPrimary)
                        .ThenBy(i => i.SortOrder)
                        .Select(i => i.ImageUrl)
                        .FirstOrDefault()
                };
            }).ToList();
    }

    public async Task<PublicProductDetailDto?> GetProductDetailAsync(string slug, long productId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var product = await _context.Products
            .Include(p => p.Images)
            .Include(p => p.Variants)
            .FirstOrDefaultAsync(p =>
                p.Id == productId &&
                p.StoreId == store.Id &&
                p.Status == ProductStatus.Active);

        if (product == null) return null;

        var activeWarehouseIds = await _context.Warehouses
            .Where(w => w.StoreId == store.Id && w.IsActive)
            .Select(w => w.Id)
            .ToListAsync();

        var stocks = await _context.InventoryStocks
            .Where(i => i.ProductId == productId && activeWarehouseIds.Contains(i.WarehouseId))
            .ToListAsync();

        var totalQuantity = stocks.Sum(s => s.QuantityAvailable);

        var activeVariants = product.Variants.Where(v => v.IsActive).ToList();

        var variantDtos = activeVariants.Select(v => new PublicProductVariantDto
        {
            Id = v.Id,
            VariantName = v.VariantName,
            Sku = v.Sku,
            PriceAdjustment = v.PriceAdjustment,
            Image = v.Image,
            AvailableQuantity = stocks.Where(s => s.VariantId == v.Id).Sum(s => s.QuantityAvailable)
        }).ToList();

        var rating = await _context.ProductReviews
            .Where(r => r.StoreId == store.Id && r.ProductId == productId && r.IsApproved)
            .Select(r => (double)r.Rating)
            .ToListAsync();

        return new PublicProductDetailDto
        {
            Id = product.Id,
            CategoryId = product.CategoryId,
            NameAr = product.NameAr,
            NameEn = product.NameEn,
            DescriptionAr = product.DescriptionAr,
            DescriptionEn = product.DescriptionEn,
            BasePrice = product.BasePrice,
            DiscountPrice = product.DiscountPrice,
            Sku = product.Sku,
            HasVariants = product.HasVariants,
            AvailableQuantity = totalQuantity,
            AverageRating = rating.Count > 0 ? rating.Average() : 0,
            RatingCount = rating.Count,
            Images = product.Images
                .OrderByDescending(i => i.IsPrimary)
                .ThenBy(i => i.SortOrder)
                .Select(i => new PublicProductImageDto
                {
                    ImageUrl = i.ImageUrl,
                    IsPrimary = i.IsPrimary,
                    SortOrder = i.SortOrder
                }).ToList(),
            Variants = variantDtos
        };
    }

    public async Task<PublicStorePageDto?> GetStorePageAsync(string slug, string pageKey)
    {
        var store = await GetActiveStoreBySlugAsync(slug);
        if (store == null || string.IsNullOrWhiteSpace(pageKey))
            return null;

        var key = pageKey.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(store.StorePagesJson))
            return null;

        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var pages = JsonSerializer.Deserialize<List<PublicStorePageDto>>(store.StorePagesJson, options);
            var page = pages?.FirstOrDefault(p =>
                string.Equals(p.Key, key, StringComparison.OrdinalIgnoreCase) && p.IsEnabled);
            return page;
        }
        catch
        {
            return null;
        }
    }

    public async Task<ReturnPolicyDto?> GetReturnPolicyAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return new ReturnPolicyDto
        {
            ReturnPolicyText = store.ReturnPolicyText,
            ReturnPolicyDays = store.ReturnPolicyDays
        };
    }

    public async Task<List<PublicStoreFaqItemDto>?> GetStoreFaqAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return await _context.StoreFaqItems
            .Where(f => f.StoreId == store.Id && f.IsPublished)
            .OrderBy(f => f.DisplayOrder)
            .ThenBy(f => f.Id)
            .Select(f => new PublicStoreFaqItemDto
            {
                Id = f.Id,
                QuestionAr = f.QuestionAr,
                QuestionEn = f.QuestionEn,
                AnswerAr = f.AnswerAr,
                AnswerEn = f.AnswerEn,
                DisplayOrder = f.DisplayOrder
            })
            .ToListAsync();
    }

    public async Task<List<PublicStoreBlogPostDto>?> GetStoreBlogPostsAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return await _context.StoreBlogPosts
            .Where(b => b.StoreId == store.Id && b.Status == "Published")
            .OrderByDescending(b => b.PublishedAt)
            .ThenByDescending(b => b.CreatedAt)
            .Select(b => new PublicStoreBlogPostDto
            {
                Id = b.Id,
                TitleAr = b.TitleAr,
                TitleEn = b.TitleEn,
                SlugAr = b.SlugAr,
                SlugEn = b.SlugEn,
                ContentAr = b.ContentAr,
                ContentEn = b.ContentEn,
                FeaturedImage = b.FeaturedImage,
                AuthorName = b.AuthorName,
                PublishedAt = b.PublishedAt
            })
            .ToListAsync();
    }

    public async Task<PublicStoreBlogPostDto?> GetStoreBlogPostAsync(string slug, string slugKey)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var post = await _context.StoreBlogPosts
            .FirstOrDefaultAsync(b =>
                b.StoreId == store.Id &&
                b.Status == "Published" &&
                (b.SlugAr == slugKey || b.SlugEn == slugKey));

        if (post == null) return null;

        return new PublicStoreBlogPostDto
        {
            Id = post.Id,
            TitleAr = post.TitleAr,
            TitleEn = post.TitleEn,
            SlugAr = post.SlugAr,
            SlugEn = post.SlugEn,
            ContentAr = post.ContentAr,
            ContentEn = post.ContentEn,
            FeaturedImage = post.FeaturedImage,
            AuthorName = post.AuthorName,
            PublishedAt = post.PublishedAt
        };
    }

    public async Task<StoreContactDto?> GetContactAsync(string slug)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        return new StoreContactDto
        {
            Phone = store.ContactPhone,
            Email = store.ContactEmail,
            Address = store.ContactAddress
        };
    }

    public async Task<PublicOrderDetailDto?> GetOrderAsync(string slug, string orderNumber, string? phone, long? customerId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var order = await _context.Orders
            .Include(o => o.Customer)
            .Include(o => o.Items)
            .Include(o => o.StatusHistory)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.ShippingCompany)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.Events)
            .FirstOrDefaultAsync(o => o.StoreId == store.Id && o.OrderNumber == orderNumber);

        if (order == null) return null;

        var authorized = false;

        if (customerId != null && order.CustomerId == customerId)
        {
            authorized = true;
        }
        else if (!string.IsNullOrWhiteSpace(phone))
        {
            var expectedPhone = order.CustomerId != null ? order.Customer!.Phone : order.GuestPhone;
            authorized = expectedPhone == phone;
        }

        if (!authorized) return null;

        var payment = await _context.Payments
            .Where(p => p.OrderId == order.Id && p.ProviderType == Domain.Enums.PaymentProviderType.BankTransfer)
            .OrderByDescending(p => p.CreatedAt)
            .FirstOrDefaultAsync();

        return new PublicOrderDetailDto
        {
            Id = order.Id,
            OrderNumber = order.OrderNumber,
            Status = order.Status.ToString(),
            SubTotal = order.SubTotal,
            DiscountAmount = order.DiscountAmount,
            ShippingCost = order.ShippingCost,
            TotalAmount = order.TotalAmount,
            ShippingAddress = order.ShippingAddress,
            Notes = order.Notes,
            ShippingMethod = order.ShippingMethodType?.ToString(),
            PaymentMethod = order.PaymentMethodType?.ToString(),
            PaymentStatus = order.PaymentStatus.ToString(),
            BankTransfer = order.PaymentMethodType == PaymentMethodType.BankTransfer && store != null
                ? new FatooraRahatak.Application.DTOs.Payment.BankTransferInfoDto
                {
                    BankName = store.PayoutBankName,
                    AccountHolder = store.PayoutAccountHolder,
                    Iban = store.PayoutIban,
                    ReceiptUrl = payment?.BankReceiptUrl,
                    TransferReference = payment?.BankTransferReference
                }
                : null,
            CreatedAt = order.CreatedAt,
            Items = order.Items.Select(i => new PublicOrderItemDto
            {
                ProductNameSnapshot = i.ProductNameSnapshot,
                Quantity = i.Quantity,
                UnitPriceSnapshot = i.UnitPriceSnapshot,
                LineTotal = i.LineTotal
            }).ToList(),
            StatusHistory = order.StatusHistory
                .OrderBy(h => h.ChangedAt)
                .Select(h => new PublicOrderStatusHistoryDto
                {
                    Status = h.Status.ToString(),
                    ChangedAt = h.ChangedAt
                }).ToList(),
            Shipments = order.Shipments
                .OrderByDescending(s => s.CreatedAt)
                .Select(s => new PublicShipmentDto
                {
                    Id = s.Id,
                    Awb = s.Awb,
                    Status = s.Status.ToString(),
                    ShippingCompanyName = s.ShippingCompany != null ? s.ShippingCompany.Name : "",
                    DestinationCity = s.DestinationCity,
                    Events = s.Events
                        .OrderByDescending(e => e.EventAt)
                        .Select(e => new PublicShipmentEventDto
                        {
                            EventCode = e.EventCode,
                            Description = e.Description,
                            EventAt = e.EventAt
                        }).ToList()
                }).ToList()
        };
    }

    public async Task<List<PublicProductReviewDto>?> GetProductReviewsAsync(string slug, long productId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var productExists = await _context.Products
            .AnyAsync(p => p.Id == productId && p.StoreId == store.Id && p.Status == ProductStatus.Active);
        if (!productExists) return null;

        return await _context.ProductReviews
            .Where(r => r.StoreId == store.Id && r.ProductId == productId && r.IsApproved)
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new PublicProductReviewDto
            {
                Id = r.Id,
                CustomerName = r.CustomerName,
                Rating = r.Rating,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<PublicProductReviewDto?> CreateProductReviewAsync(string slug, long productId, long? customerId, CreateProductReviewDto dto)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return null;

        var product = await _context.Products
            .FirstOrDefaultAsync(p => p.Id == productId && p.StoreId == store.Id && p.Status == ProductStatus.Active);
        if (product == null) return null;

        if (!store.IsReviewsEnabled)
            throw new InvalidOperationException("التقييمات غير مفعّلة في هذا المتجر حاليًا");

        if (string.IsNullOrWhiteSpace(dto.CustomerName))
            throw new InvalidOperationException("الاسم مطلوب لتقديم تقييم");

        if (dto.Rating < 1 || dto.Rating > 5)
            throw new InvalidOperationException("التقييم يجب أن يكون بين 1 و 5 نجوم");

        if (string.IsNullOrWhiteSpace(dto.Comment))
            throw new InvalidOperationException("الرأي مطلوب لتقديم تقييم");

        // منع السبام: لازم العميل يكون اشترى المنتج فعليًا قبل ما يقيّمه
        var purchased = await HasPurchasedProductAsync(store.Id, product.Id, customerId, dto.Phone);
        if (!purchased)
            throw new InvalidOperationException("يمكنك تقييم المنتج فقط بعد شرائه من هذا المتجر");

        // منع تكرار التقييم لنفس المشتري على نفس المنتج
        var duplicate = await _context.ProductReviews.AnyAsync(r =>
            r.StoreId == store.Id &&
            r.ProductId == product.Id &&
            (customerId != null
                ? r.CustomerId == customerId
                : r.CustomerId == null && dto.Phone != null && r.CustomerPhone == NormalizePhone(dto.Phone)));
        if (duplicate)
            throw new InvalidOperationException("لقد قمت بتقييم هذا المنتج من قبل");

        var review = new ProductReview
        {
            StoreId = store.Id,
            ProductId = product.Id,
            CustomerId = customerId,
            CustomerName = dto.CustomerName.Trim(),
            CustomerPhone = customerId == null && dto.Phone != null ? NormalizePhone(dto.Phone) : null,
            Rating = dto.Rating,
            Comment = dto.Comment.Trim(),
            IsApproved = true
        };

        _context.ProductReviews.Add(review);
        await _context.SaveChangesAsync();

        return new PublicProductReviewDto
        {
            Id = review.Id,
            CustomerName = review.CustomerName,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }

    private async Task<bool> HasPurchasedProductAsync(long storeId, long productId, long? customerId, string? phone)
    {
        var orderQuery = _context.Orders
            .Where(o => o.StoreId == storeId && o.Items.Any(i => i.ProductId == productId));

        if (customerId != null)
            return await orderQuery.AnyAsync(o => o.CustomerId == customerId);

        if (!string.IsNullOrWhiteSpace(phone))
        {
            var normalized = NormalizePhone(phone);
            var orders = await orderQuery
                .Select(o => new { o.CustomerId, o.GuestPhone })
                .ToListAsync();

            if (orders.Any(o => o.GuestPhone != null && NormalizePhone(o.GuestPhone) == normalized))
                return true;

            var matchingUser = await _context.Users.AsNoTracking()
                .Where(u => u.Phone != null)
                .ToListAsync();
            var userId = matchingUser.FirstOrDefault(u => NormalizePhone(u.Phone!) == normalized)?.Id;
            if (userId != null && orders.Any(o => o.CustomerId == userId))
                return true;
        }

        return false;
    }

    private static string NormalizePhone(string phone)
    {
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00"))
            digits = digits.Substring(2);
        if (digits.StartsWith("0"))
            digits = digits.Substring(1);
        return digits;
    }

    private async Task<Domain.Entities.Customers.CustomerAddress?> FindAddressAsync(long storeId, string phone, long addressId)
    {
        return await _context.CustomerAddresses
            .FirstOrDefaultAsync(a => a.Id == addressId && a.StoreId == storeId && a.Phone == NormalizePhone(phone));
    }

    public async Task<List<CustomerAddressDto>> GetCustomerAddressesAsync(string slug, string phone)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return new List<CustomerAddressDto>();

        var normalized = NormalizePhone(phone);
        var addresses = await _context.CustomerAddresses
            .Where(a => a.StoreId == store.Id && a.Phone == normalized)
            .OrderByDescending(a => a.IsDefault)
            .ThenByDescending(a => a.UpdatedAt)
            .ToListAsync();

        return addresses.Select(MapAddress).ToList();
    }

    public async Task<CustomerAddressDto> SaveCustomerAddressAsync(string slug, string phone, SaveCustomerAddressDto dto)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var normalized = NormalizePhone(phone);
        if (normalized.Length < 9)
            throw new InvalidOperationException("رقم الجوال غير صحيح");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new InvalidOperationException("الاسم مطلوب");
        if (string.IsNullOrWhiteSpace(dto.City))
            throw new InvalidOperationException("المدينة مطلوبة");
        if (string.IsNullOrWhiteSpace(dto.AddressLine))
            throw new InvalidOperationException("العنوان مطلوب");

        if (dto.IsDefault)
        {
            await MakeOtherAddressesNonDefaultAsync(store.Id, normalized);
        }

        var address = new Domain.Entities.Customers.CustomerAddress
        {
            StoreId = store.Id,
            Phone = normalized,
            FullName = dto.FullName.Trim(),
            City = dto.City.Trim(),
            AddressLine = dto.AddressLine.Trim(),
            Landmark = dto.Landmark?.Trim(),
            Notes = dto.Notes?.Trim(),
            IsDefault = dto.IsDefault
        };

        _context.CustomerAddresses.Add(address);
        await _context.SaveChangesAsync();
        return MapAddress(address);
    }

    public async Task<CustomerAddressDto> UpdateCustomerAddressAsync(string slug, string phone, long addressId, SaveCustomerAddressDto dto)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var address = await FindAddressAsync(store.Id, phone, addressId);
        if (address == null)
            throw new InvalidOperationException("العنوان غير موجود");

        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new InvalidOperationException("الاسم مطلوب");
        if (string.IsNullOrWhiteSpace(dto.City))
            throw new InvalidOperationException("المدينة مطلوبة");
        if (string.IsNullOrWhiteSpace(dto.AddressLine))
            throw new InvalidOperationException("العنوان مطلوب");

        if (dto.IsDefault && !address.IsDefault)
        {
            await MakeOtherAddressesNonDefaultAsync(store.Id, address.Phone);
        }

        address.FullName = dto.FullName.Trim();
        address.City = dto.City.Trim();
        address.AddressLine = dto.AddressLine.Trim();
        address.Landmark = dto.Landmark?.Trim();
        address.Notes = dto.Notes?.Trim();
        address.IsDefault = dto.IsDefault;
        address.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return MapAddress(address);
    }

    public async Task DeleteCustomerAddressAsync(string slug, string phone, long addressId)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null)
            throw new InvalidOperationException("المتجر غير موجود أو غير نشط");

        var address = await FindAddressAsync(store.Id, phone, addressId);
        if (address == null)
            throw new InvalidOperationException("العنوان غير موجود");

        _context.CustomerAddresses.Remove(address);
        await _context.SaveChangesAsync();
    }

    public async Task<List<CustomerOrderListItemDto>> GetCustomerOrdersAsync(string slug, string phone)
    {
        var store = await GetOnlineStoreBySlugAsync(slug);
        if (store == null) return new List<CustomerOrderListItemDto>();

        var normalized = NormalizePhone(phone);
        var users = await _context.Users.AsNoTracking()
            .Where(u => u.Phone != null)
            .ToListAsync();
        var userId = users.FirstOrDefault(u => NormalizePhone(u.Phone!) == normalized)?.Id;

        var orders = await _context.Orders
            .Include(o => o.Items)
            .Where(o => o.StoreId == store.Id)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();

        var customerOrders = orders
            .Where(o =>
                (userId != null && o.CustomerId == userId)
                || (o.GuestPhone != null && NormalizePhone(o.GuestPhone) == normalized))
            .Select(o => new CustomerOrderListItemDto
            {
                Id = o.Id,
                OrderNumber = o.OrderNumber,
                Status = o.Status.ToString(),
                TotalAmount = o.TotalAmount,
                ItemCount = o.Items.Count,
                CreatedAt = o.CreatedAt,
                CanCancel = o.Status is OrderStatus.New or OrderStatus.Processing or OrderStatus.PendingPayment
            })
            .ToList();

        return customerOrders;
    }

    public async Task<PublicShippingQuoteResultDto> GetShippingQuoteAsync(string slug, PublicShippingQuoteRequestDto dto)
    {
        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.StoreSlug == slug && s.Status == StoreStatus.Active && s.IsOnline);

        if (store == null || string.IsNullOrWhiteSpace(dto.SessionId) || string.IsNullOrWhiteSpace(dto.ShippingAddress))
            return new PublicShippingQuoteResultDto { Available = false };

        // نفس الشركة اللي هيُختار أوتوماتيك عند تأكيد الطلب فعليًا (الافتراضية أو أول شركة مفعّلة)
        var company = await _context.ShippingCompanies
            .Where(c => c.StoreId == store.Id && c.Enabled)
            .OrderBy(c => c.IsDefault ? 0 : 1)
            .ThenBy(c => c.Id)
            .FirstOrDefaultAsync();

        if (company == null)
            return new PublicShippingQuoteResultDto { Available = false, Message = "لا توجد شركة شحن مفعّلة لهذا المتجر حاليًا" };

        var cart = await _context.Carts
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(c => c.StoreId == store.Id && c.SessionId == dto.SessionId && c.Status == CartStatus.Active);

        if (cart == null || cart.Items.Count == 0)
            return new PublicShippingQuoteResultDto { Available = false };

        var weight = cart.Items.Sum(i => i.Quantity * (i.Product.Weight ?? 1));
        var subtotal = cart.Items.Sum(i => i.Quantity * i.PriceAtAdd);
        var city = Domain.Entities.Shipping.ShipmentHelpers.ParseCity(dto.ShippingAddress);

        var cost = Shipping.ShippingCostCalculator.Calculate(company.RateConfigJson, city, weight, null);
        var isFree = false;

        // نفس منطق الشحن المجاني المطبّق فعليًا عند إتمام الطلب (حد الشحن المجاني)
        if (store.Package?.HasShippingDiscounts == true && store.FreeShippingThreshold.HasValue
            && subtotal >= store.FreeShippingThreshold.Value)
        {
            cost = 0;
            isFree = true;
        }
        else if (store.Package?.HasShippingDiscounts == true && store.ShippingDiscountPercent is > 0)
        {
            cost = Math.Max(0m, cost * (1 - store.ShippingDiscountPercent.Value / 100m));
        }

        return new PublicShippingQuoteResultDto
        {
            Available = true,
            ShippingCost = cost,
            Currency = "SAR",
            CompanyName = company.Name,
            EstimatedDeliveryDays = Shipping.ShippingCostCalculator.EstimatedDays(company.RateConfigJson, 0),
            IsFreeShipping = isFree
        };
    }

    private async Task MakeOtherAddressesNonDefaultAsync(long storeId, string phone)
    {
        var others = await _context.CustomerAddresses
            .Where(a => a.StoreId == storeId && a.Phone == phone && a.IsDefault)
            .ToListAsync();
        foreach (var a in others)
        {
            a.IsDefault = false;
        }
    }

    private static CustomerAddressDto MapAddress(Domain.Entities.Customers.CustomerAddress a) => new()
    {
        Id = a.Id,
        FullName = a.FullName,
        City = a.City,
        AddressLine = a.AddressLine,
        Landmark = a.Landmark,
        Notes = a.Notes,
        IsDefault = a.IsDefault
    };
}