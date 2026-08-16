using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Infrastructure.Services;
using FatooraRahatak.Infrastructure.Services.Shipping;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Enums;
using FluentValidation;
using FluentValidation.AspNetCore;
using FatooraRahatak.Application.Validators;
using FatooraRahatak.API.BackgroundServices;

var builder = WebApplication.CreateBuilder(args);
var corsOrigins = (builder.Configuration["App:CorsOrigins"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
        {
            var trimmed = origin.TrimEnd('.').ToLowerInvariant();
            return corsOrigins.Any(o => string.Equals(o.TrimEnd('.').ToLowerInvariant(), trimmed, StringComparison.Ordinal));
        })
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
builder.Services.AddScoped<IValidator<FatooraRahatak.Application.DTOs.Auth.RegisterDto>, RegisterDtoValidator>();
builder.Services.AddScoped<IValidator<FatooraRahatak.Application.DTOs.Auth.ForgotPasswordDto>, ForgotPasswordDtoValidator>();
builder.Services.AddScoped<IValidator<FatooraRahatak.Application.DTOs.Auth.VerifyAccountDto>, VerifyAccountDtoValidator>();
builder.Services.AddScoped<IValidator<FatooraRahatak.Application.DTOs.Auth.ResetPasswordDto>, ResetPasswordDtoValidator>();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<FatooraRahatak.Application.Common.JwtSettings>(
    builder.Configuration.GetSection("JwtSettings"));

var jwtSettings = builder.Configuration.GetSection("JwtSettings");
// سر JWT يُؤخذ من متغير البيئة JWT_SECRET أولًا (للإنتاج)،
// مع fallback لقيمة الإعدادات المحلية للتطوير فقط.
var secretKey = Environment.GetEnvironmentVariable("JWT_SECRET") ?? jwtSettings["SecretKey"]!;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IAuthService, FatooraRahatak.Infrastructure.Services.AuthService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<MoyasarPaymentProvider>();
builder.Services.AddScoped<PayPalPaymentProvider>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddHttpClient();
builder.Services.AddMemoryCache();
builder.Services.AddScoped<ICustomerSessionService, CustomerSessionService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IStoreService, FatooraRahatak.Infrastructure.Services.StoreService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICategoryService, FatooraRahatak.Infrastructure.Services.CategoryService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IProductService, FatooraRahatak.Infrastructure.Services.ProductService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IInventoryService, FatooraRahatak.Infrastructure.Services.InventoryService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IEmployeeService, FatooraRahatak.Infrastructure.Services.EmployeeService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IProductVariantService, FatooraRahatak.Infrastructure.Services.ProductVariantService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IStockCountService, FatooraRahatak.Infrastructure.Services.StockCountService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ISubscriptionService, FatooraRahatak.Infrastructure.Services.SubscriptionService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IAttendanceService, FatooraRahatak.Infrastructure.Services.AttendanceService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IPayrollService, FatooraRahatak.Infrastructure.Services.PayrollService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICartService, FatooraRahatak.Infrastructure.Services.CartService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICouponService, FatooraRahatak.Infrastructure.Services.CouponService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IAdminService, FatooraRahatak.Infrastructure.Services.AdminService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IPublicStoreService, FatooraRahatak.Infrastructure.Services.PublicStoreService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOrderService, FatooraRahatak.Infrastructure.Services.OrderService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOrderStockService, FatooraRahatak.Infrastructure.Services.OrderStockService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOwnerCustomerService, FatooraRahatak.Infrastructure.Services.OwnerCustomerService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOwnerDashboardService, FatooraRahatak.Infrastructure.Services.OwnerDashboardService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IAccountingService, FatooraRahatak.Infrastructure.Services.AccountingService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.INotificationService, FatooraRahatak.Infrastructure.Services.NotificationService>();
builder.Services.AddScoped<IKpiService, KpiService>();
builder.Services.AddScoped<IDomainService, DomainService>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.AddScoped<IInvitationService, InvitationService>();
builder.Services.AddScoped<IRoleService, RoleService>();
builder.Services.AddScoped<IPermissionCheckService, PermissionCheckService>();
builder.Services.AddScoped<ISiteService, SiteService>();
builder.Services.AddScoped<ISiteMenuService, SiteMenuService>();
builder.Services.AddScoped<IDashboardSectionService, DashboardSectionService>();
builder.Services.AddScoped<ICareerService, CareerService>();
builder.Services.AddScoped<IAcademyService, AcademyService>();
builder.Services.AddScoped<IReferralService, ReferralService>();
builder.Services.AddScoped<ICustomerNotificationService, CustomerNotificationService>();
builder.Services.AddScoped<IWhatsAppService, WhatsAppService>();
builder.Services.AddScoped<IQuickLoginService, QuickLoginService>();
builder.Services.AddDirectoryBrowser();
builder.Services.AddHostedService<SubscriptionExpiryBackgroundService>();
builder.Services.AddHostedService<PendingPaymentReconcilerBackgroundService>();
builder.Services.AddScoped<IShippingProvider, SmsaShippingProvider>();
builder.Services.AddScoped<IShippingProvider, AramexShippingProvider>();
builder.Services.AddScoped<IShippingProvider, ZajilShippingProvider>();
builder.Services.AddScoped<IShippingProvider, NaqelShippingProvider>();
builder.Services.AddScoped<IShippingProvider, ManualShippingProvider>();
builder.Services.AddScoped<ShippingProviderFactory>();
builder.Services.AddScoped<IShippingService, ShippingService>();
builder.Services.AddScoped<IApiKeyService, ApiKeyService>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IPdfService, PdfService>();
builder.Services.AddScoped<ISettlementService, SettlementService>();
builder.Services.AddHostedService<SettlementBackgroundService>();
builder.Services.Configure<FatooraRahatak.Infrastructure.Services.Zatca.ZatcaSettings>(
    builder.Configuration.GetSection("Zatca"));
builder.Services.AddHttpClient<FatooraRahatak.Infrastructure.Services.Zatca.ZatcaClient>();
builder.Services.AddScoped<IZatcaService, FatooraRahatak.Infrastructure.Services.Zatca.ZatcaService>();
var app = builder.Build();

app.UseForwardedHeaders(new ForwardedHeadersOptions
{
    ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto |
                       Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedHost
});
app.UseStaticFiles();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await FatooraRahatak.Infrastructure.Data.Seed.DataSeeder.SeedAsync(db);

    // Backfill: اعتماد جميع القيود التلقائية القديمة (PendingApproval → Approved)
    var pendingAutoEntries = await db.Set<JournalEntry>()
        .Where(e => e.Status == JournalEntryStatus.PendingApproval && e.IsAutoGenerated)
        .ToListAsync();
    foreach (var entry in pendingAutoEntries)
    {
        entry.Status = JournalEntryStatus.Approved;
        entry.ApprovedByUserId = entry.CreatedByUserId;
        entry.UpdatedAt = DateTime.UtcNow;
    }
    if (pendingAutoEntries.Count > 0)
        await db.SaveChangesAsync();

    var domainService = scope.ServiceProvider.GetRequiredService<IDomainService>();
    await domainService.SeedSubdomainsForExistingStoresAsync();

    // Backfill: ترقية أكواد الإحالة القصيرة (أقل من 7 خانات) إلى كود رقمي أطول 7-8 خانات
    var referralService = scope.ServiceProvider.GetRequiredService<IReferralService>();
    var upgradedCodes = await referralService.UpgradeLegacyCodesAsync();
    if (upgradedCodes > 0)
        Console.WriteLine($"[Seeding] Upgraded {upgradedCodes} legacy referral code(s) to 7-8 digit format.");
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
app.UseCors("AllowFrontend");
app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();