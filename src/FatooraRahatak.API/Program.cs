using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FatooraRahatak.Infrastructure.Data;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Infrastructure.Services;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Enums;
using FluentValidation;
using FluentValidation.AspNetCore;
using FatooraRahatak.Application.Validators;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
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
var secretKey = jwtSettings["SecretKey"]!;

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
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddHttpClient();
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
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOwnerCustomerService, FatooraRahatak.Infrastructure.Services.OwnerCustomerService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IOwnerDashboardService, FatooraRahatak.Infrastructure.Services.OwnerDashboardService>();
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
builder.Services.AddDirectoryBrowser();
var app = builder.Build();

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