using FatooraRahatak.Application.DTOs;
using FatooraRahatak.Application.DTOs.Shipping;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Orders;
using FatooraRahatak.Domain.Entities.Shipping;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Infrastructure.Services.Shipping;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace FatooraRahatak.Infrastructure.Services;

public class ShippingService : IShippingService
{
    private readonly AppDbContext _context;
    private readonly ShippingProviderFactory _providerFactory;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _config;

    public ShippingService(AppDbContext context, ShippingProviderFactory providerFactory, HttpClient httpClient, IConfiguration config)
    {
        _context = context;
        _providerFactory = providerFactory;
        _httpClient = httpClient;
        _config = config;
    }

    public async Task<List<ShippingCompanyDto>> GetCompaniesAsync(long storeId)
    {
        return await _context.ShippingCompanies
            .Where(c => c.StoreId == storeId)
            .OrderByDescending(c => c.IsDefault)
            .ThenBy(c => c.Id)
            .Select(c => new ShippingCompanyDto
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code.ToString(),
                Enabled = c.Enabled,
                IsDefault = c.IsDefault,
                RateConfigJson = c.RateConfigJson,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<ShippingCompanyDto> CreateCompanyAsync(long storeId, CreateShippingCompanyDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("اسم شركة الشحن مطلوب");

        if (!Enum.TryParse<ShippingCompanyCode>(dto.Code, true, out var code))
            code = ShippingCompanyCode.Manual;

        var package = await _context.Stores
            .Include(s => s.Package)
            .Where(s => s.Id == storeId)
            .Select(s => s.Package)
            .FirstOrDefaultAsync();

        if (package == null)
            throw new InvalidOperationException("المتجر غير موجود");

        if (!package.HasShippingIntegration)
            throw new InvalidOperationException("تكامل شركات الشحن غير متاح في باقتك الحالية. قم بترقية باقتك لتفعيله.");

        var existingCount = await _context.ShippingCompanies.CountAsync(c => c.StoreId == storeId);
        if (package.MaxShippingCompanies != -1 && existingCount >= package.MaxShippingCompanies)
            throw new InvalidOperationException($"باقتك الحالية تسمح بإضافة {package.MaxShippingCompanies} شركة شحن فقط");

        var company = new ShippingCompany
        {
            StoreId = storeId,
            Name = dto.Name,
            Code = code,
            Enabled = dto.Enabled,
            IsDefault = dto.IsDefault,
            RateConfigJson = dto.RateConfigJson
        };

        if (company.IsDefault)
            await ClearDefaultAsync(storeId);

        _context.ShippingCompanies.Add(company);
        await _context.SaveChangesAsync();

        return MapCompany(company);
    }

    public async Task<ShippingCompanyDto> UpdateCompanyAsync(long storeId, long companyId, UpdateShippingCompanyDto dto)
    {
        var company = await _context.ShippingCompanies
            .FirstOrDefaultAsync(c => c.Id == companyId && c.StoreId == storeId);
        if (company == null)
            throw new InvalidOperationException("شركة الشحن غير موجودة");

        if (dto.Name != null) company.Name = dto.Name;
        if (dto.RateConfigJson != null) company.RateConfigJson = dto.RateConfigJson;
        if (dto.Enabled.HasValue) company.Enabled = dto.Enabled.Value;
        if (dto.IsDefault.HasValue && dto.IsDefault.Value && !company.IsDefault)
        {
            await ClearDefaultAsync(storeId);
            company.IsDefault = true;
        }

        company.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapCompany(company);
    }

    public async Task DeleteCompanyAsync(long storeId, long companyId)
    {
        var company = await _context.ShippingCompanies
            .FirstOrDefaultAsync(c => c.Id == companyId && c.StoreId == storeId);
        if (company == null)
            throw new InvalidOperationException("شركة الشحن غير موجودة");

        _context.ShippingCompanies.Remove(company);
        await _context.SaveChangesAsync();
    }

    public async Task<ShippingQuoteDto> GetQuoteAsync(long storeId, ShippingQuoteRequestDto dto)
    {
        var company = await _context.ShippingCompanies
            .FirstOrDefaultAsync(c => c.Id == dto.ShippingCompanyId && c.StoreId == storeId);
        if (company == null)
            throw new InvalidOperationException("شركة الشحن غير موجودة");
        if (!company.Enabled)
            throw new InvalidOperationException("شركة الشحن غير مفعّلة حاليًا");

        var provider = _providerFactory.Get(company.Code);
        var cost = ShippingCostCalculator.Calculate(company.RateConfigJson, dto.DestinationCity, dto.Weight, dto.CodAmount);

        return new ShippingQuoteDto
        {
            ShippingCompanyId = company.Id,
            CompanyName = company.Name,
            CompanyCode = company.Code.ToString(),
            EstimatedCost = cost,
            CodFee = company.Code != ShippingCompanyCode.Manual ? 0 : null,
            Currency = "SAR",
            EstimatedDeliveryDays = ShippingCostCalculator.EstimatedDays(company.RateConfigJson, provider.EstimatedDeliveryDays)
        };
    }

    public async Task<ShipmentDto> CreateShipmentAsync(long storeId, CreateShipmentDto dto)
    {
        var orderNumber = dto.OrderNumber?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(orderNumber))
            throw new InvalidOperationException("رقم الطلب مطلوب");

        var order = await _context.Orders
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.OrderNumber == orderNumber && o.StoreId == storeId);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود — تأكد من رقم الطلب");

        var company = await _context.ShippingCompanies
            .FirstOrDefaultAsync(c => c.Id == dto.ShippingCompanyId && c.StoreId == storeId);
        if (company == null)
            throw new InvalidOperationException("شركة الشحن غير موجودة");
        if (!company.Enabled)
            throw new InvalidOperationException("شركة الشحن غير مفعّلة حاليًا");

        var existing = await _context.Shipments
            .AnyAsync(s => s.OrderId == order.Id);
        if (existing)
            throw new InvalidOperationException("هذا الطلب لديه شحنة مسجلة بالفعل");

        var provider = _providerFactory.Get(company.Code);

        var ctx = new ShippingProviderContext
        {
            ApiBaseUrl = providerCred(company).apiBaseUrl,
            ApiKey = providerCred(company).apiKey,
            ApiSecret = providerCred(company).apiSecret,
            RateConfigJson = company.RateConfigJson,
            DestinationCity = ShipmentHelpers.ParseCity(order.ShippingAddress),
            DestinationAddress = order.ShippingAddress,
            RecipientName = order.CustomerId != null
                ? order.Customer?.FullName
                : order.GuestName,
            RecipientPhone = order.CustomerId != null
                ? order.Customer?.Phone
                : order.GuestPhone,
            Weight = dto.Weight,
            CodAmount = order.PaymentMethodType == PaymentMethodType.CashOnDelivery ? order.TotalAmount : null,
            Currency = "SAR",
            Reference = order.OrderNumber,
            HttpClient = _httpClient
        };

        var result = await provider.CreateShipmentAsync(ctx);

        var shipment = new Shipment
        {
            StoreId = storeId,
            OrderId = order.Id,
            ShippingCompanyId = company.Id,
            Awb = result.Awb,
            Status = result.Success ? MapCreateStatus(result.Status) : ShipmentStatus.Pending,
            LabelUrl = result.LabelUrl,
            DestinationCity = ShipmentHelpers.ParseCity(order.ShippingAddress),
            DestinationAddress = order.ShippingAddress,
            RecipientName = ctx.RecipientName,
            RecipientPhone = ctx.RecipientPhone,
            Weight = dto.Weight,
            CodAmount = ctx.CodAmount,
            ShippingCost = ShippingCostCalculator.Calculate(company.RateConfigJson, ctx.DestinationCity, dto.Weight, ctx.CodAmount),
            Currency = "SAR",
            // ⚠️ تمييز الشحن الوهمي: تُوضع علامة "تجريبي" واضحة في ملاحظات الشحنة حتى لا يظن
            // صاحب المتجر أن الشحنة حقيقية (لا توجد مفاتيح API للشركة بعد).
            Notes = result.IsSimulation
                ? string.IsNullOrWhiteSpace(dto.Notes)
                    ? "⚠️ وضع تجريبي — رقم التتبع افتراضي (لا توجد مفاتيح API حقيقية بعد)"
                    : $"{dto.Notes} | ⚠️ وضع تجريبي — رقم التتبع افتراضي"
                : dto.Notes,
            IsSimulation = result.IsSimulation,
            LastSyncedAt = DateTime.UtcNow
        };

        if (!result.Success)
            throw new InvalidOperationException(result.Message ?? "فشل إنشاء الشحنة");

        _context.Shipments.Add(shipment);
        await _context.SaveChangesAsync();

        foreach (var evt in result.Events)
        {
            _context.ShipmentEvents.Add(new ShipmentEvent
            {
                ShipmentId = shipment.Id,
                EventCode = evt.EventCode,
                Description = evt.Description,
                EventAt = evt.EventAt
            });
        }
        await _context.SaveChangesAsync();

        return await LoadShipmentDtoAsync(storeId, shipment.Id) ?? throw new InvalidOperationException("تعذر تحميل الشحنة");
    }

    public async Task<PagedResult<ShipmentListDto>> GetShipmentsAsync(long storeId, string? status = null, int page = 1, int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.Shipments
            .Include(s => s.ShippingCompany)
            .Include(s => s.Order)
            .Where(s => s.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<ShipmentStatus>(status, true, out var statusEnum))
            query = query.Where(s => s.Status == statusEnum);

        var totalCount = await query.CountAsync();

        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new ShipmentListDto
            {
                Id = s.Id,
                OrderId = s.OrderId,
                OrderNumber = s.Order.OrderNumber,
                ShippingCompanyName = s.ShippingCompany != null ? s.ShippingCompany.Name : "",
                ShippingCompanyCode = s.ShippingCompany != null ? s.ShippingCompany.Code.ToString() : "",
                Awb = s.Awb,
                Status = s.Status.ToString(),
                DestinationCity = s.DestinationCity,
                ShippingCost = s.ShippingCost,
                IsSimulation = s.IsSimulation,
                CreatedAt = s.CreatedAt,
                LastSyncedAt = s.LastSyncedAt
            })
            .ToListAsync();

        return new PagedResult<ShipmentListDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = items
        };
    }

    public async Task<ShipmentDto?> GetShipmentAsync(long storeId, long shipmentId)
        => await LoadShipmentDtoAsync(storeId, shipmentId);

    public async Task<ShipmentDto?> GetShipmentByOrderAsync(long storeId, long orderId)
    {
        var shipment = await _context.Shipments
            .FirstOrDefaultAsync(s => s.StoreId == storeId && s.OrderId == orderId);
        return shipment == null ? null : await LoadShipmentDtoAsync(storeId, shipment.Id);
    }

    public async Task<SyncShipmentResultDto> SyncShipmentAsync(long storeId, long shipmentId)
    {
        var shipment = await _context.Shipments
            .Include(s => s.ShippingCompany)
            .FirstOrDefaultAsync(s => s.Id == shipmentId && s.StoreId == storeId);
        if (shipment == null)
            throw new InvalidOperationException("الشحنة غير موجودة");
        if (shipment.ShippingCompany == null)
            throw new InvalidOperationException("شركة الشحن غير موجودة");

        if (string.IsNullOrWhiteSpace(shipment.Awb))
            throw new InvalidOperationException("لا يوجد رقم تتبع لهذه الشحنة");

        var provider = _providerFactory.Get(shipment.ShippingCompany.Code);

        var ctx = new ShippingProviderContext
        {
            ApiBaseUrl = providerCred(shipment.ShippingCompany).apiBaseUrl,
            ApiKey = providerCred(shipment.ShippingCompany).apiKey,
            ApiSecret = providerCred(shipment.ShippingCompany).apiSecret,
            Reference = shipment.OrderId.ToString(),
            HttpClient = _httpClient
        };

        var result = await provider.GetTrackingAsync(ctx, shipment.Awb);

        if (result.Success && Enum.TryParse<ShipmentStatus>(result.Status, true, out var mappedStatus))
            shipment.Status = mappedStatus;

        shipment.LastSyncedAt = DateTime.UtcNow;
        shipment.UpdatedAt = DateTime.UtcNow;

        var knownKeys = await _context.ShipmentEvents
            .Where(e => e.ShipmentId == shipment.Id)
            .Select(e => $"{e.EventCode}|{e.EventAt:O}")
            .ToListAsync();

        foreach (var evt in result.Events)
        {
            var key = $"{evt.EventCode}|{evt.EventAt?.ToString("O")}";
            if (!knownKeys.Contains(key))
            {
                _context.ShipmentEvents.Add(new ShipmentEvent
                {
                    ShipmentId = shipment.Id,
                    EventCode = evt.EventCode,
                    Description = evt.Description,
                    EventAt = evt.EventAt
                });
            }
        }

        await _context.SaveChangesAsync();

        var dto = await LoadShipmentDtoAsync(storeId, shipment.Id);

        return new SyncShipmentResultDto
        {
            ShipmentId = shipment.Id,
            Awb = shipment.Awb,
            Status = shipment.Status.ToString(),
            Synced = true,
            Message = result.Message,
            Events = dto?.Events ?? new()
        };
    }

    public async Task<ShipmentDto?> UpdateShipmentStatusAsync(long storeId, long shipmentId, UpdateShipmentStatusDto dto)
    {
        if (!Enum.TryParse<ShipmentStatus>(dto.Status, true, out var status))
            throw new InvalidOperationException("حالة الشحنة غير صحيحة");

        var shipment = await _context.Shipments
            .FirstOrDefaultAsync(s => s.Id == shipmentId && s.StoreId == storeId);
        if (shipment == null)
            throw new InvalidOperationException("الشحنة غير موجودة");

        shipment.Status = status;
        shipment.UpdatedAt = DateTime.UtcNow;

        _context.ShipmentEvents.Add(new ShipmentEvent
        {
            ShipmentId = shipment.Id,
            EventCode = status.ToString(),
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"تم تحديث حالة الشحنة إلى {GetShipmentStatusLabel(status)}"
                : dto.Description,
            EventAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return await LoadShipmentDtoAsync(storeId, shipment.Id);
    }

    private async Task<ShipmentDto?> LoadShipmentDtoAsync(long storeId, long shipmentId)
    {
        var s = await _context.Shipments
            .Include(s => s.ShippingCompany)
            .Include(s => s.Order)
            .Include(s => s.Events)
            .FirstOrDefaultAsync(s => s.Id == shipmentId && s.StoreId == storeId);

        if (s == null) return null;

        // فرض ميزات الباقة: تتبع الشحن وطباعة اللاصقات
        var package = await _context.Packages.FindAsync(await _context.Stores.Where(x => x.Id == storeId).Select(x => x.PackageId).FirstOrDefaultAsync());
        var hasTracking = package?.HasShippingTracking ?? false;
        var hasLabelPrinting = package?.HasShippingLabelPrinting ?? false;

        return new ShipmentDto
        {
            Id = s.Id,
            OrderId = s.OrderId,
            OrderNumber = s.Order.OrderNumber,
            ShippingCompanyId = s.ShippingCompanyId,
            ShippingCompanyName = s.ShippingCompany?.Name ?? "",
            ShippingCompanyCode = s.ShippingCompany?.Code.ToString() ?? "",
            Awb = s.Awb,
            Status = s.Status.ToString(),
            LabelUrl = hasLabelPrinting ? s.LabelUrl : null,
            DestinationCity = s.DestinationCity,
            DestinationAddress = s.DestinationAddress,
            RecipientName = s.RecipientName,
            RecipientPhone = s.RecipientPhone,
            Weight = s.Weight,
            CodAmount = s.CodAmount,
            ShippingCost = s.ShippingCost,
            Currency = s.Currency,
            Notes = s.Notes,
            IsSimulation = s.IsSimulation,
            CreatedAt = s.CreatedAt,
            LastSyncedAt = s.LastSyncedAt,
            Events = hasTracking
                ? s.Events
                    .OrderByDescending(e => e.EventAt ?? e.CreatedAt)
                    .Select(e => new ShipmentEventDto
                    {
                        Id = e.Id,
                        EventCode = e.EventCode,
                        Description = e.Description,
                        EventAt = e.EventAt
                    })
                    .ToList()
                : new List<ShipmentEventDto>()
        };
    }

    private static ShippingCompanyDto MapCompany(ShippingCompany c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Code = c.Code.ToString(),
        Enabled = c.Enabled,
        IsDefault = c.IsDefault,
        RateConfigJson = c.RateConfigJson,
        CreatedAt = c.CreatedAt
    };

    // 🔑 الخيار B: مفاتيح شركات الشحن تُدار مركزيًا من إعدادات المنصة (appsettings)
    // وليس من صاحب المتجر — المتجر يفعّل الشركة ويحدد السعر فقط.
    private (string apiBaseUrl, string apiKey, string apiSecret) providerCred(ShippingCompany company)
    {
        var section = _config.GetSection($"Shipping:Providers:{company.Code}");
        return (
            section["ApiBaseUrl"] ?? company.ApiBaseUrl ?? string.Empty,
            section["ApiKey"] ?? company.ApiKey ?? string.Empty,
            section["ApiSecret"] ?? company.ApiSecret ?? string.Empty
        );
    }

    private async Task ClearDefaultAsync(long storeId)
    {
        var defaults = await _context.ShippingCompanies
            .Where(c => c.StoreId == storeId && c.IsDefault)
            .ToListAsync();
        foreach (var d in defaults)
        {
            d.IsDefault = false;
            d.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static ShipmentStatus MapCreateStatus(string status)
        => Enum.TryParse<ShipmentStatus>(status, true, out var s) ? s : ShipmentStatus.Pending;

    private static string GetShipmentStatusLabel(ShipmentStatus status) => status switch
    {
        ShipmentStatus.Pending => "بانتظار الشحن",
        ShipmentStatus.Registered => "تم التسجيل لدى الشركة",
        ShipmentStatus.PickedUp => "تم الاستلام من المرسل",
        ShipmentStatus.InTransit => "في الطريق",
        ShipmentStatus.OutForDelivery => "خارج للتوصيل",
        ShipmentStatus.Delivered => "تم التسليم",
        ShipmentStatus.Failed => "فشل التوصيل",
        ShipmentStatus.Cancelled => "تم الإلغاء",
        ShipmentStatus.Returned => "تم الإرجاع",
        _ => status.ToString()
    };
}