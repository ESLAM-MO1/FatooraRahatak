using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using FatooraRahatak.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
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
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IStoreService, FatooraRahatak.Infrastructure.Services.StoreService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICategoryService, FatooraRahatak.Infrastructure.Services.CategoryService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IProductService, FatooraRahatak.Infrastructure.Services.ProductService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IInventoryService, FatooraRahatak.Infrastructure.Services.InventoryService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IEmployeeService, FatooraRahatak.Infrastructure.Services.EmployeeService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ISubscriptionService, FatooraRahatak.Infrastructure.Services.SubscriptionService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IProductVariantService, FatooraRahatak.Infrastructure.Services.ProductVariantService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IStockCountService, FatooraRahatak.Infrastructure.Services.StockCountService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IAttendanceService, FatooraRahatak.Infrastructure.Services.AttendanceService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.IPayrollService, FatooraRahatak.Infrastructure.Services.PayrollService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICartService, FatooraRahatak.Infrastructure.Services.CartService>();
builder.Services.AddScoped<FatooraRahatak.Application.Interfaces.ICouponService, FatooraRahatak.Infrastructure.Services.CouponService>();
var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await FatooraRahatak.Infrastructure.Data.Seed.DataSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();