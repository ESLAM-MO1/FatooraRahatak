using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace FatooraRahatak.Infrastructure.Data.Seed;

public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext context)
    {
        await SeedRolesAndPermissionsAsync(context);
        await SeedPackagesAsync(context);
        await SeedSuperAdminAsync(context);
        await SeedSiteContentAsync(context);
        await SeedLandingPageContentAsync(context);
        await SeedAllSitePagesAsync(context);
        await SeedThemesAsync(context);
    }

    private static async Task SeedRolesAndPermissionsAsync(AppDbContext context)
    {
        var moduleActions = new Dictionary<string, PermissionAction[]>
        {

            ["StoreManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["PackageManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformUserManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformFinancialReports"] = new[] { PermissionAction.View },
            ["PlatformSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["AuditLog"] = new[] { PermissionAction.View },

            ["Dashboard"] = new[] { PermissionAction.View },
            ["StoreSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["EmployeeManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["SubscriptionPackage"] = new[] { PermissionAction.View, PermissionAction.Edit },

            ["Products"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Categories"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Warehouses"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["StockTransfer"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["DamagedStock"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Approve },
            ["Inventory"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["StockCounts"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["Statistics"] = new[] { PermissionAction.View },

            ["POS"] = new[] { PermissionAction.View, PermissionAction.Add },
            ["Orders"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Coupons"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Customers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Payments"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },

            ["ChartOfAccounts"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["JournalEntries"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["Ledger"] = new[] { PermissionAction.View },
            ["Invoices"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Vouchers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["FixedAssets"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Payroll"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["FinancialReports"] = new[] { PermissionAction.View },
            ["Attendance"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
            ["LeaveRequests"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },

            ["PaymentGateways"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PaymentLinks"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["ShippingCompanies"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
            ["Referrals"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
        };

        // Upsert permissions (idempotent — adds only the missing ones for existing DBs)
        var existingCodes = await context.Permissions.Select(p => p.PermissionCode).ToListAsync();
        var existingCodeSet = existingCodes.ToHashSet();
        var newPermissions = new List<Permission>();
        foreach (var module in moduleActions)
        {
            foreach (var action in module.Value)
            {
                var code = $"{module.Key}.{action}";
                if (!existingCodeSet.Contains(code))
                {
                    newPermissions.Add(new Permission
                    {
                        ModuleName = module.Key,
                        ActionType = action,
                        PermissionCode = code
                    });
                }
            }
        }
        if (newPermissions.Count > 0)
        {
            await context.Permissions.AddRangeAsync(newPermissions);
            await context.SaveChangesAsync();
        }

        var allPermissions = await context.Permissions.ToListAsync();
        var permByCode = allPermissions.ToDictionary(p => p.PermissionCode, p => p.Id);

        // Upsert roles (only the missing ones)
        var existingRoleNames = await context.Roles.Select(r => r.RoleName).ToListAsync();
        var roleNameSet = existingRoleNames.ToHashSet();
        var roleDefs = new List<Role>
        {
            new() { RoleName = "SuperAdmin", RoleScope = RoleScope.Platform, IsSystemRole = true },
            new() { RoleName = "SupportStaff", RoleScope = RoleScope.Platform, IsSystemRole = true },
            new() { RoleName = "Owner", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Accountant", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Cashier", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "InventoryManager", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "OrdersManager", RoleScope = RoleScope.Store, IsSystemRole = true },
            new() { RoleName = "Marketing", RoleScope = RoleScope.Store, IsSystemRole = true },
        };
        foreach (var role in roleDefs)
        {
            if (!roleNameSet.Contains(role.RoleName))
            {
                context.Roles.Add(role);
                roleNameSet.Add(role.RoleName);
            }
        }
        await context.SaveChangesAsync();

        var roleByName = await context.Roles
            .Where(r => r.RoleScope == RoleScope.Store || r.RoleScope == RoleScope.Platform)
            .ToDictionaryAsync(r => r.RoleName, r => r.Id);

        var platformModules = new[]
        {
            "StoreManagement", "PackageManagement", "PlatformUserManagement",
            "PlatformFinancialReports", "PlatformSettings", "AuditLog"
        };

        var rolePermissionMap = new Dictionary<string, string[]>
        {
            ["SuperAdmin"] = moduleActions
                .Where(m => platformModules.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["SupportStaff"] = new[]
            {
                "StoreManagement.View", "StoreManagement.Edit",
                "PackageManagement.View", "PlatformUserManagement.View",
                "PlatformFinancialReports.View", "PlatformSettings.View", "AuditLog.View"
            },

            ["Owner"] = moduleActions
                .Where(m => !platformModules.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["Accountant"] = new[]
            {
                "Dashboard.View", "StoreSettings.View", "SubscriptionPackage.View",
                "Products.View", "Categories.View", "Warehouses.View",
                "Orders.View", "Customers.View", "Payments.View",
                "ChartOfAccounts.View", "ChartOfAccounts.Add", "ChartOfAccounts.Edit",
                "JournalEntries.View", "JournalEntries.Add", "JournalEntries.Edit",
                "Ledger.View",
                "Invoices.View", "Invoices.Add", "Invoices.Edit",
                "Vouchers.View", "Vouchers.Add", "Vouchers.Edit",
                "FixedAssets.View", "FixedAssets.Add", "FixedAssets.Edit",
                "Payroll.View", "FinancialReports.View",
                "PaymentGateways.View", "PaymentLinks.Add", "ShippingCompanies.View"
            },

            ["Cashier"] = new[]
            {
                "Dashboard.View",
                "Products.View", "POS.View", "POS.Add",
                "Orders.View", "Orders.Add",
                "Customers.View", "Customers.Add",
                "Invoices.View", "Invoices.Add",
                "Payments.View"
            },

            ["InventoryManager"] = new[]
            {
                "Dashboard.View",
                "Products.View", "Products.Add", "Products.Edit",
                "Categories.View", "Categories.Add", "Categories.Edit",
                "Warehouses.View", "Warehouses.Add", "Warehouses.Edit",
                "Inventory.View", "Inventory.Add", "Inventory.Edit",
                "StockCounts.View", "StockCounts.Add", "StockCounts.Edit", "StockCounts.Approve",
                "StockTransfer.View", "StockTransfer.Add", "StockTransfer.Edit",
                "DamagedStock.View", "DamagedStock.Add",
                "Orders.View"
            },

            ["OrdersManager"] = new[]
            {
                "Dashboard.View",
                "Products.View", "Orders.View", "Orders.Add", "Orders.Edit",
                "Coupons.View", "Customers.View", "Customers.Add", "Customers.Edit",
                "POS.View", "Warehouses.View", "ShippingCompanies.View",
                "Payments.View"
            },

            ["Marketing"] = new[]
            {
                "Dashboard.View",
                "Products.View", "Products.Edit",
                "Categories.View", "Orders.View",
                "Coupons.View", "Coupons.Add", "Coupons.Edit",
                "Customers.View", "Statistics.View",
                "Referrals.View"
            },
        };

        // Upsert role-permission links (only add missing ones — never remove admin customizations)
        foreach (var map in rolePermissionMap)
        {
            if (!roleByName.TryGetValue(map.Key, out var roleId)) continue;
            var existingPermIds = await context.RolePermissions
                .Where(rp => rp.RoleId == roleId)
                .Select(rp => rp.PermissionId)
                .ToListAsync();
            var existingPermSet = existingPermIds.ToHashSet();

            foreach (var code in map.Value)
            {
                if (permByCode.TryGetValue(code, out var permId) && !existingPermSet.Contains(permId))
                {
                    context.RolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permId });
                }
            }
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedPackagesAsync(AppDbContext context)
    {
        const int Unlimited = -1;

        var specs = new[]
        {
            new
            {
                PackageName = "المجانية",
                MonthlyPrice = 0m,
                MaxProducts = (int?)20,
                MaxOrdersPerMonth = (int?)30,
                MaxEmployees = 2,
                MaxWarehouses = 1,
                MaxBranchesPOS = 1,
                MaxPaymentGateways = 1,
                MaxShippingCompanies = 0,
                HasAccountingFull = false,
                HasPayroll = false,
                HasZatcaInvoice = true,
                HasCustomDomain = false,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                HasPos = true,
                HasLogo = true,
                MaxThemes = 1,
                CommissionPercentage = 5m,
                Color = "#6B7280",
                HasShippingIntegration = false,
                HasShippingCalculator = false,
                HasShippingTracking = false,
                HasShippingLabelPrinting = false,
                HasFreeShipping = false,
                HasCashOnDelivery = false,
                HasShippingDiscounts = false
            },
            new
            {
                PackageName = "الإنطلاق",
                MonthlyPrice = 69m,
                MaxProducts = (int?)500,
                MaxOrdersPerMonth = (int?)500,
                MaxEmployees = 10,
                MaxWarehouses = 3,
                MaxBranchesPOS = 1,
                MaxPaymentGateways = 2,
                MaxShippingCompanies = 2,
                HasAccountingFull = true,
                HasPayroll = false,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                HasPos = true,
                HasLogo = true,
                MaxThemes = 3,
                CommissionPercentage = 3m,
                Color = "#12A8DB",
                HasShippingIntegration = true,
                HasShippingCalculator = true,
                HasShippingTracking = true,
                HasShippingLabelPrinting = false,
                HasFreeShipping = false,
                HasCashOnDelivery = true,
                HasShippingDiscounts = false
            },
            new
            {
                PackageName = "التوسع",
                MonthlyPrice = 169m,
                MaxProducts = (int?)2000,
                MaxOrdersPerMonth = (int?)2000,
                MaxEmployees = 25,
                MaxWarehouses = 10,
                MaxBranchesPOS = 3,
                MaxPaymentGateways = Unlimited,
                MaxShippingCompanies = 5,
                HasAccountingFull = true,
                HasPayroll = true,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = true,
                HasApiAccess = false,
                HasPos = true,
                HasLogo = true,
                MaxThemes = 10,
                CommissionPercentage = 1.5m,
                Color = "#1FB983",
                HasShippingIntegration = true,
                HasShippingCalculator = true,
                HasShippingTracking = true,
                HasShippingLabelPrinting = true,
                HasFreeShipping = true,
                HasCashOnDelivery = true,
                HasShippingDiscounts = true
            },
            new
            {
                PackageName = "الريادة",
                MonthlyPrice = 269m,
                MaxProducts = (int?)null,
                MaxOrdersPerMonth = (int?)null,
                MaxEmployees = Unlimited,
                MaxWarehouses = Unlimited,
                MaxBranchesPOS = Unlimited,
                MaxPaymentGateways = Unlimited,
                MaxShippingCompanies = Unlimited,
                HasAccountingFull = true,
                HasPayroll = true,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = true,
                HasApiAccess = true,
                HasPos = true,
                HasLogo = true,
                MaxThemes = Unlimited,
                CommissionPercentage = 0m,
                Color = "#C9A227",
                HasShippingIntegration = true,
                HasShippingCalculator = true,
                HasShippingTracking = true,
                HasShippingLabelPrinting = true,
                HasFreeShipping = true,
                HasCashOnDelivery = true,
                HasShippingDiscounts = true
            }
        };

        foreach (var spec in specs)
        {
            var existing = await context.Packages.FirstOrDefaultAsync(p => p.PackageName == spec.PackageName);
            if (existing == null)
            {
                context.Packages.Add(new Package
                {
                    PackageName = spec.PackageName,
                    MonthlyPrice = spec.MonthlyPrice,
                    MaxProducts = spec.MaxProducts,
                    MaxOrdersPerMonth = spec.MaxOrdersPerMonth,
                    MaxEmployees = spec.MaxEmployees,
                    MaxWarehouses = spec.MaxWarehouses,
                    MaxBranchesPOS = spec.MaxBranchesPOS,
                    MaxPaymentGateways = spec.MaxPaymentGateways,
                    MaxShippingCompanies = spec.MaxShippingCompanies,
                    HasAccountingFull = spec.HasAccountingFull,
                    HasPayroll = spec.HasPayroll,
                    HasZatcaInvoice = spec.HasZatcaInvoice,
                    HasCustomDomain = spec.HasCustomDomain,
                    HasAffiliateMarketing = spec.HasAffiliateMarketing,
                    HasApiAccess = spec.HasApiAccess,
                    HasPos = spec.HasPos,
                    HasLogo = spec.HasLogo,
                    MaxThemes = spec.MaxThemes,
                    CommissionPercentage = spec.CommissionPercentage,
                    Color = spec.Color,
                    HasShippingIntegration = spec.HasShippingIntegration,
                    HasShippingCalculator = spec.HasShippingCalculator,
                    HasShippingTracking = spec.HasShippingTracking,
                    HasShippingLabelPrinting = spec.HasShippingLabelPrinting,
                    HasFreeShipping = spec.HasFreeShipping,
                    HasCashOnDelivery = spec.HasCashOnDelivery,
                    HasShippingDiscounts = spec.HasShippingDiscounts,
                    IsActive = true
                });
            }
        }

        await context.SaveChangesAsync();
    }

    private static async Task SeedSuperAdminAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync(u => u.Email == "admin@platform.com"))
            return;

        // كلمة المرور تُؤخذ من متغير البيئة SUPER_ADMIN_PASSWORD،
        // وإلا تُولَّد عشوائيًا — لا توجد كلمة افتراضية معلومة تُسلَّم للعميل.
        var password = Environment.GetEnvironmentVariable("SUPER_ADMIN_PASSWORD");
        if (string.IsNullOrWhiteSpace(password))
            password = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
                .Replace("+", "x").Replace("/", "y").Replace("=", "");

        var superAdmin = new User
        {
            FullName = "منصة الإدارة",
            Email = "admin@platform.com",
            Phone = "0500000001",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            UserType = UserType.SuperAdmin,
            IsActive = true,
            IsVerified = true
        };

        context.Users.Add(superAdmin);
        await context.SaveChangesAsync();

        Console.WriteLine($"[SEED] SuperAdmin created: admin@platform.com / {password}");
    }

    private static async Task SeedSiteContentAsync(AppDbContext context)
    {
        if (await context.Set<SitePage>().AnyAsync()) return;

        context.Set<SitePage>().AddRange(
            new SitePage { PageKey = "about", TitleAr = "عن المنصة", TitleEn = "About Us", ContentAr = "<h2>فاتورة راحتك</h2><p>منصة سحابية متكاملة لإدارة المتاجر الإلكترونية، توفر حلولاً شاملة من إنشاء المتجر وإدارة المنتجات والمخزون إلى النظام المحاسبي الكامل والفواتير الإلكترونية.</p><p>نهدف إلى تمكين رواد الأعمال في المملكة العربية السعودية من إدارة أعمالهم بكفاءة واحترافية من خلال أدوات سهلة الاستخدام ومتكاملة.</p>", ContentEn = "<h2>Faturat Rahatik</h2><p>A comprehensive SaaS platform for e-commerce management.</p>" },
            new SitePage { PageKey = "help-center", TitleAr = "مركز المساعدة", TitleEn = "Help Center", ContentAr = "<h2>مرحبًا بك في مركز المساعدة</h2><p>هذا المركز قيد الإعداد حاليًا. سنوفر قريبًا أدلة وشروحات مفصلة لكل أجزاء المنصة.</p>", ContentEn = "<h2>Welcome to Help Center</h2><p>Coming soon.</p>" }
        );

        context.Set<SiteFaqItem>().AddRange(
            new SiteFaqItem { QuestionAr = "هل الباقة المجانية مجانية للأبد؟", QuestionEn = "Is the free plan free forever?", AnswerAr = "نعم، الباقة المجانية مجانية مدى الحياة بدون أي رسوم مخفية.", AnswerEn = "Yes, the free plan is free forever with no hidden fees.", DisplayOrder = 1 },
            new SiteFaqItem { QuestionAr = "هل يمكنني تغيير باقتي في أي وقت؟", QuestionEn = "Can I change my plan anytime?", AnswerAr = "نعم، يمكنك الترقية في أي وقت فوريًا. الترقية من باقة أعلى إلى أقل تتطلب خفض استخدامك أولاً.", AnswerEn = "Yes, you can upgrade anytime instantly. Downgrading requires reducing your usage first.", DisplayOrder = 2 },
            new SiteFaqItem { QuestionAr = "هل النظام متوافق مع الفاتورة الإلكترونية ZATCA؟", QuestionEn = "Is the system ZATCA compliant?", AnswerAr = "نعم، المنصة تدعم الفاتورة الإلكترونية (المرحلة الثانية): توليد XML بمواصفات UBL 2.1، التوقيع الرقمي XAdES-BES بشهادة CSID، إرسال الفواتير لبوابة زاتكا (Clearance/Reporting)، وQR Code مبني على البيانات الموقّعة. يتطلب التفعيل التسجيل ضريبيًا لدى زاتكا وتنفيذ تسجيل الجهاز (Onboarding) بشهادة CSID.", AnswerEn = "Yes, the platform supports e-invoicing (phase 2): UBL 2.1 XML generation, XAdES-BES digital signing with a CSID certificate, invoice submission to the ZATCA portal (Clearance/Reporting), and a QR Code built from the signed data. Activation requires VAT registration and device onboarding with a CSID.", DisplayOrder = 3 },
            new SiteFaqItem { QuestionAr = "كيف أضيف موظفين لحسابي؟", QuestionEn = "How do I add employees to my account?", AnswerAr = "يمكنك دعوة موظفين من لوحة التحكم عبر قسم الموظفين. ستحدد صلاحيات كل موظف حسب دوره.", AnswerEn = "You can invite employees from the dashboard. Set permissions for each employee based on their role.", DisplayOrder = 4 },
            new SiteFaqItem { QuestionAr = "هل يمكنني استخدام دومين خاص لمتجري؟", QuestionEn = "Can I use a custom domain?", AnswerAr = "نعم، يتوفر ربط دومين خاص في باقة التوسع والريادة.", AnswerEn = "Yes, custom domain is available in the Growth and Enterprise plans.", DisplayOrder = 5 }
        );

        context.Set<BlogPost>().AddRange(
            new BlogPost { TitleAr = "كيف تبدأ متجرك الإلكتروني في 5 دقائق", SlugAr = "how-to-start-your-store", ContentAr = "<p>إنشاء متجر إلكتروني احترافي لم يكن بهذه السهولة من قبل. مع منصة فاتورة راحتك، يمكنك البدء في خطوات بسيطة.</p><h3>الخطوة الأولى: إنشاء حساب</h3><p>سجل في المنصة وأنشئ متجرك ببضع نقرات.</p><h3>الخطوة الثانية: أضف منتجاتك</h3><p>ارفع منتجاتك مع الصور والأسعار والتصنيفات.</p>", AuthorName = "فريق فاتورة راحتك", Status = "Published", PublishedAt = DateTime.UtcNow },
            new BlogPost { TitleAr = "الفرق بين الفاتورة الضريبية والمبسطة", SlugAr = "tax-invoice-vs-simplified", ContentAr = "<p>توضح هيئة الزكاة والضريبة والجمارك أن هناك نوعين من الفواتير الإلكترونية في المملكة.</p>", AuthorName = "فريق فاتورة راحتك", Status = "Published", PublishedAt = DateTime.UtcNow }
        );

        await context.SaveChangesAsync();
    }

    private static async Task SeedLandingPageContentAsync(AppDbContext context)
    {
        var newContent = new
        {
            siteName = "فاتورة راحتك",
            siteDescription = "منصة إدارة المتاجر",
            hero = new
            {
                title = "فاتورة راحتك\nنمِّ عملك بذكاء",
                description = "اخترنا لك أفضل أدوات التجارة الإلكترونية تحت سقف واحد. من المتجر الإلكتروني، إلى فواتير المبيعات والمشتريات، والقسائم الإلكترونية، ونظام نقاط البيع، والمدفوعات عبر الإنترنت.",
                backgroundImage = "",
                primaryCta = "ابدأ مجاناً",
                primaryCtaHref = "/register",
                secondaryCta = "اعرف أكثر",
                secondaryCtaHref = "#",
                stats = new[] {
                    new { number = "10,000+", label = "تاجر" },
                    new { number = "50,000+", label = "فاتورة" },
                    new { number = "99.9%", label = "وقت تشغيل" },
                }
            },
            videoSection = new { title = "كل احتياجات تجارتك في منصة واحدة", description = "تواصل مع عملائك بسهولة وأبقهم على اطلاع دائم. أرسل روابط الدفع والفواتير عبر وسائل التواصل الاجتماعي لتوفير تجربة دفع سلسة.", videoUrl = "" },
            features = new[] {
                new { title = "متجرك الإلكتروني", description = "حل يتيح لك بيع جميع منتجاتك عن بُعد. اربط متجرك بوسائل التواصل الاجتماعي وحقق نجاح مشروعك بسهولة.", image = "", knowMoreText = "", knowMoreHref = "" },
                new { title = "روابط الدفع", description = "أرسل روابط دفع احترافية لعملائك واستلم المدفوعات بسرعة وأمان عبر قنوات التواصل المفضلة لديهم.", image = "", knowMoreText = "اعرف المزيد", knowMoreHref = "#" },
                new { title = "اجمع المدفوعات بشكل أسرع باستخدام بوابة الدفع", description = "استقبل مدفوعاتك بأمان ووسّع نشاطك محلياً وعالمياً مع أفضل بوابات الدفع في الشرق الأوسط.", image = "", knowMoreText = "", knowMoreHref = "" },
                new { title = "الكاشير ونقاط البيع", description = "نظام كاشير سريع وسهل لإدارة المبيعات في متجرك الفعلي. يدعم الباركود، الطلبات، والفواتير.", image = "", knowMoreText = "اعرف المزيد", knowMoreHref = "#" },
                new { title = "استخدم الذكاء الاصطناعي", description = "استفد من أدوات الذكاء الاصطناعي في Faturat Rahatik لإعداد الصور، وإنشاء المحتوى التسويقي، وتطوير متجرك بذكاء.", image = "", knowMoreText = "", knowMoreHref = "" },
            },
            distinctiveSection = new
            {
                title = "لماذا تختار فاتورة راحتك Faturat Rahatik؟",
                cards = new[] {
                    new { title = "أدوات متعددة في نظام واحد", description = "المتجر، الفواتير، الكاشير، روابط الدفع، والمزيد في منصة واحدة." },
                    new { title = "واجهات سهلة الاستخدام", description = "تصميم عصري وبسيط يسهل على الجميع استخدامه دون تعقيد." },
                    new { title = "أمان وخصوصية عاليتان", description = "بياناتك مشفرة ومحمية بأعلى معايير الأمان العالمية." },
                },
                ctaText = "",
                ctaHref = ""
            },
            footer = new
            {
                description = "منصة متكاملة لإدارة متجرك الإلكتروني، الفواتير، روابط الدفع، الكاشير، والمزيد.",
                copyright = "جميع الحقوق محفوظة.",
                social = new { facebook = "#", instagram = "#", whatsapp = "#" }
            }
        };

        var json = System.Text.Json.JsonSerializer.Serialize(newContent, new System.Text.Json.JsonSerializerOptions { WriteIndented = false });

        // Check if setting already exists
        var existing = await context.PlatformSettings.FirstOrDefaultAsync(s => s.SettingKey == "landing_page_content");
        if (existing == null)
        {
            context.PlatformSettings.Add(new PlatformSetting
            {
                SettingKey = "landing_page_content",
                SettingValue = json,
                UpdatedAt = DateTime.UtcNow
            });
        }
        else
        {
            // Only overwrite if content hasn't been customized (still has old default hero title)
            try
            {
                var old = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>(existing.SettingValue);
                var oldTitle = old.TryGetProperty("hero", out var h) && h.TryGetProperty("title", out var t) ? t.GetString() : "";
                if (oldTitle == "منصة متكاملة لإدارة\nمتجرك بالكامل")
                {
                    existing.SettingValue = json;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }
            catch
            {
                // if parsing fails, leave existing content untouched
            }
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedAllSitePagesAsync(AppDbContext context)
    {
        var pages = new[]
        {
            new SitePage { PageKey = "about", TitleAr = "عن المنصة", TitleEn = "About Us", ContentAr = "<h2>فاتورة راحتك</h2><p>منصة سحابية متكاملة لإدارة المتاجر الإلكترونية، توفر حلولاً شاملة من إنشاء المتجر وإدارة المنتجات والمخزون إلى النظام المحاسبي الكامل والفواتير الإلكترونية.</p><p>نهدف إلى تمكين رواد الأعمال في المملكة العربية السعودية من إدارة أعمالهم بكفاءة واحترافية من خلال أدوات سهلة الاستخدام ومتكاملة.</p>", ContentEn = "<h2>Faturat Rahatik</h2><p>A comprehensive SaaS platform for e-commerce management.</p>" },
            new SitePage { PageKey = "help-center", TitleAr = "مركز المساعدة", TitleEn = "Help Center", ContentAr = "<h2>مرحبًا بك في مركز المساعدة</h2><p>هذا المركز قيد الإعداد حاليًا. سنوفر قريبًا أدلة وشروحات مفصلة لكل أجزاء المنصة.</p>", ContentEn = "<h2>Welcome to Help Center</h2><p>Coming soon.</p>" },
            new SitePage { PageKey = "contact", TitleAr = "تواصل معنا", TitleEn = "Contact Us", ContentAr = "<h2>تواصل معنا</h2><p>نحن هنا لمساعدتك! أرسل لنا رسالة وسنرد عليك في أقرب وقت ممكن.</p>", ContentEn = "<h2>Contact Us</h2><p>We are here to help! Send us a message and we'll get back to you as soon as possible.</p>" },
            new SitePage { PageKey = "terms-of-use", TitleAr = "شروط الاستخدام", TitleEn = "Terms of Use", ContentAr = "<h2>شروط الاستخدام</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر شروط الاستخدام قريبًا.</p>", ContentEn = "<h2>Terms of Use</h2><p>This page is under construction. Terms of use will be published soon.</p>" },
            new SitePage { PageKey = "privacy-policy", TitleAr = "سياسة الخصوصية", TitleEn = "Privacy Policy", ContentAr = "<h2>سياسة الخصوصية</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر سياسة الخصوصية قريبًا.</p>", ContentEn = "<h2>Privacy Policy</h2><p>This page is under construction. Privacy policy will be published soon.</p>" },
            new SitePage { PageKey = "affiliate-marketing", TitleAr = "التسويق بالعمولة", TitleEn = "Affiliate Marketing", ContentAr = "<h2>التسويق بالعمولة</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر تفاصيل برنامج التسويق بالعمولة قريبًا.</p>", ContentEn = "<h2>Affiliate Marketing</h2><p>This page is under construction. Affiliate program details will be published soon.</p>" },
            new SitePage { PageKey = "careers", TitleAr = "التوظيف", TitleEn = "Careers", ContentAr = "<h2>التوظيف</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر الفرص الوظيفية قريبًا.</p>", ContentEn = "<h2>Careers</h2><p>This page is under construction. Job opportunities will be published soon.</p>" },
            new SitePage { PageKey = "free-tools", TitleAr = "أدوات مجانية", TitleEn = "Free Tools", ContentAr = "<h2>أدوات مجانية</h2><p>هذه الصفحة قيد الإعداد. سيتم إطلاق الأدوات المجانية قريبًا.</p>", ContentEn = "<h2>Free Tools</h2><p>This page is under construction. Free tools will be launched soon.</p>" },
            new SitePage { PageKey = "security-standards", TitleAr = "معايير الأمان", TitleEn = "Security Standards", ContentAr = "<h2>معايير الأمان</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر معايير الأمان قريبًا.</p>", ContentEn = "<h2>Security Standards</h2><p>This page is under construction. Security standards will be published soon.</p>" },
            new SitePage { PageKey = "agency-program", TitleAr = "برنامج الوكالة", TitleEn = "Agency Program", ContentAr = "<h2>برنامج الوكالة</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر تفاصيل برنامج الوكالة قريبًا.</p>", ContentEn = "<h2>Agency Program</h2><p>This page is under construction. Agency program details will be published soon.</p>" },
            new SitePage { PageKey = "shipping-policy", TitleAr = "سياسة الشحن", TitleEn = "Shipping Policy", ContentAr = "<h2>سياسة الشحن</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر سياسة الشحن قريبًا.</p>", ContentEn = "<h2>Shipping Policy</h2><p>This page is under construction. Shipping policy will be published soon.</p>" },
            new SitePage { PageKey = "return-policy", TitleAr = "سياسة الاستبدال والاسترجاع", TitleEn = "Return Policy", ContentAr = "<h2>سياسة الاستبدال والاسترجاع</h2><p>هذه الصفحة قيد الإعداد. سيتم نشر سياسة الاستبدال والاسترجاع قريبًا.</p>", ContentEn = "<h2>Return Policy</h2><p>This page is under construction. Return policy will be published soon.</p>" },
        };

        var featurePages = new[]
        {
            new SitePage { PageKey = "accounting-system", TitleAr = "النظام المحاسبي المتكامل", TitleEn = "Integrated Accounting System", ContentAr = "<h2>النظام المحاسبي المتكامل</h2><p>نظام محاسبي متكامل يدير جميع القيود المحاسبية، الحسابات، دفتر الأستاذ، ميزان المراجعة، قائمة الدخل، والميزانية العمومية. يتكامل مع الفواتير والمبيعات والمشتريات لتقديم تقارير مالية دقيقة في الوقت الفعلي.</p>", ContentEn = "<h2>Integrated Accounting System</h2><p>A comprehensive accounting system managing journal entries, accounts, general ledger, trial balance, income statement, and balance sheet. Integrates with invoices, sales, and purchases for real-time financial reporting.</p>" },
            new SitePage { PageKey = "pos-system", TitleAr = "نظام نقاط البيع POS", TitleEn = "POS System", ContentAr = "<h2>نظام نقاط البيع POS</h2><p>نظام نقاط بيع متطور لإدارة المبيعات في المتاجر الفعلية. يدعم الباركود، إدارة الطلبات، الفواتير الضريبية، طرق دفع متعددة، وتقارير المبيعات اليومية.</p>", ContentEn = "<h2>POS System</h2><p>Advanced point-of-sale system for managing sales in physical stores. Supports barcode scanning, order management, tax invoices, multiple payment methods, and daily sales reports.</p>" },
            new SitePage { PageKey = "ecommerce", TitleAr = "المتجر الإلكتروني", TitleEn = "E-Commerce", ContentAr = "<h2>المتجر الإلكتروني</h2><p>أنشئ متجرك الإلكتروني بكل سهولة وأطلق أعمالك على الإنترنت. تحكم في المنتجات، التصنيفات، والعروض، وادعم طرق دفع متعددة.</p>", ContentEn = "<h2>E-Commerce</h2><p>Create your online store easily and launch your business on the internet.</p>" },
            new SitePage { PageKey = "invoicing", TitleAr = "نظام الفواتير الإلكترونية", TitleEn = "E-Invoicing System", ContentAr = "<h2>نظام الفواتير الإلكترونية</h2><p>نظام فواتير متكامل يدعم الفواتير الضريبية والإلكترونية حسب متطلبات هيئة الزكاة والضريبة والجمارك (ZATCA).</p>", ContentEn = "<h2>E-Invoicing System</h2><p>Integrated invoicing system supporting tax and electronic invoices compliant with ZATCA requirements.</p>" },
            new SitePage { PageKey = "inventory-management", TitleAr = "إدارة المخزون", TitleEn = "Inventory Management", ContentAr = "<h2>إدارة المخزون</h2><p>نظام متكامل لإدارة المخزون والمخازن. تتبع الكميات، إعادة الطلب، التحويلات بين المخازن، جرد المخزون، وإدارة التلفيات. تكامل كامل مع المشتريات والمبيعات.</p>", ContentEn = "<h2>Inventory Management</h2><p>Integrated inventory and warehouse management system. Track quantities, reorder levels, inter-warehouse transfers, stock counts, and damage management. Full integration with purchases and sales.</p>" },
            new SitePage { PageKey = "smart-reports", TitleAr = "التقارير الذكية", TitleEn = "Smart Reports", ContentAr = "<h2>التقارير الذكية</h2><p>مجموعة متكاملة من التقارير الذكية لتحليل أداء متجرك. تقارير المبيعات، المشتريات، المخزون، العملاء، والموظفين مع إمكانية التصدير والطباعة.</p>", ContentEn = "<h2>Smart Reports</h2><p>A comprehensive suite of smart reports to analyze your store's performance. Sales, purchases, inventory, customer, and employee reports with export and print capabilities.</p>" },
            new SitePage { PageKey = "payment-links", TitleAr = "روابط الدفع", TitleEn = "Payment Links", ContentAr = "<h2>روابط الدفع</h2><p>أرسل روابط دفع احترافية لعملائك واستلم المدفوعات بسرعة وأمان عبر قنوات التواصل المفضلة لديهم.</p>", ContentEn = "<h2>Payment Links</h2><p>Send professional payment links to your customers and receive payments quickly and securely.</p>" },
            new SitePage { PageKey = "pos", TitleAr = "الكاشير", TitleEn = "POS", ContentAr = "<h2>الكاشير ونقاط البيع</h2><p>نظام كاشير سريع وسهل لإدارة المبيعات في متجرك الفعلي. يدعم الباركود، الطلبات، والفواتير.</p>", ContentEn = "<h2>POS System</h2><p>Fast and easy POS system for managing sales in your physical store.</p>" },
            new SitePage { PageKey = "payment-gateway", TitleAr = "بوابة الدفع", TitleEn = "Payment Gateway", ContentAr = "<h2>بوابة الدفع الإلكتروني</h2><p>بوابة دفع متكاملة تدعم جميع طرق الدفع المحلية والعالمية. استلم مدفوعاتك بأمان وسرعة فائقة.</p>", ContentEn = "<h2>Payment Gateway</h2><p>Integrated payment gateway supporting all local and global payment methods.</p>" },
            new SitePage { PageKey = "website-integration", TitleAr = "الربط مع المواقع", TitleEn = "Website Integration", ContentAr = "<h2>الربط مع المواقع</h2><p>اربط متجرك بسهولة مع موقعك الإلكتروني الحالي واستفد من أدوات الدفع والفواتير المتكاملة.</p>", ContentEn = "<h2>Website Integration</h2><p>Easily integrate your store with your existing website.</p>" },
        };

        foreach (var page in pages.Concat(featurePages))
        {
            if (!await context.Set<SitePage>().AnyAsync(p => p.PageKey == page.PageKey))
                context.Set<SitePage>().Add(page);
        }
        await context.SaveChangesAsync();
    }

    private static async Task SeedThemesAsync(AppDbContext context)
    {
        if (await context.Themes.AnyAsync()) return;

        var themeKeys = new[]
        {
            "professional-blue",
            "warm-modern",
            "natural-green",
            "pink-elegant",
            "royal-purple",
            "black-minimal",
            "b2b-formal",
            "b2b-calm",
            "restaurant",
            "pharmacy",
        };

        for (var i = 0; i < themeKeys.Length; i++)
        {
            context.Themes.Add(new Theme
            {
                ThemeKey = themeKeys[i],
                IsEnabled = true,
                DisplayOrder = i + 1,
            });
        }
        await context.SaveChangesAsync();
    }
}