using FatooraRahatak.Domain.Entities.Roles;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Entities.Platform;
using FatooraRahatak.Domain.Enums;
using Microsoft.EntityFrameworkCore;

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
    }

    private static async Task SeedRolesAndPermissionsAsync(AppDbContext context)
    {
        if (await context.Permissions.AnyAsync()) return; 

        var moduleActions = new Dictionary<string, PermissionAction[]>
        {

            ["StoreManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["PackageManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformUserManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PlatformFinancialReports"] = new[] { PermissionAction.View },
            ["PlatformSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["AuditLog"] = new[] { PermissionAction.View },

            ["StoreSettings"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["EmployeeManagement"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["SubscriptionPackage"] = new[] { PermissionAction.View, PermissionAction.Edit },

            ["Products"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Categories"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Warehouses"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["StockTransfer"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["DamagedStock"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Approve },

            ["POS"] = new[] { PermissionAction.View, PermissionAction.Add },
            ["Orders"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Coupons"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Customers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },

            ["ChartOfAccounts"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
            ["JournalEntries"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["Ledger"] = new[] { PermissionAction.View },
            ["Invoices"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Vouchers"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Approve },
            ["FixedAssets"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["Payroll"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete, PermissionAction.Approve },
            ["FinancialReports"] = new[] { PermissionAction.View },

            ["PaymentGateways"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["PaymentLinks"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit, PermissionAction.Delete },
            ["ShippingCompanies"] = new[] { PermissionAction.View, PermissionAction.Add, PermissionAction.Edit },
        };

        var permissions = new List<Permission>();
        foreach (var module in moduleActions)
        {
            foreach (var action in module.Value)
            {
                permissions.Add(new Permission
                {
                    ModuleName = module.Key,
                    ActionType = action,
                    PermissionCode = $"{module.Key}.{action}"
                });
            }
        }
        await context.Permissions.AddRangeAsync(permissions);
        await context.SaveChangesAsync();

        var permByCode = permissions.ToDictionary(p => p.PermissionCode, p => p.Id);

        var roles = new List<Role>
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
        await context.Roles.AddRangeAsync(roles);
        await context.SaveChangesAsync();

        var roleByName = roles.ToDictionary(r => r.RoleName, r => r.Id);

        var rolePermissionMap = new Dictionary<string, string[]>
        {
            ["SuperAdmin"] = moduleActions
                .Where(m => new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["SupportStaff"] = new[]
            {
                "StoreManagement.View", "StoreManagement.Edit",
                "PackageManagement.View", "PlatformUserManagement.View",
                "PlatformFinancialReports.View", "PlatformSettings.View", "AuditLog.View"
            },

            ["Owner"] = moduleActions
                .Where(m => !new[] { "StoreManagement", "PackageManagement", "PlatformUserManagement", "PlatformFinancialReports", "PlatformSettings", "AuditLog" }.Contains(m.Key))
                .SelectMany(m => m.Value.Select(a => $"{m.Key}.{a}")).ToArray(),

            ["Accountant"] = new[]
            {
                "StoreSettings.View", "SubscriptionPackage.View",
                "Products.View", "Categories.View", "Warehouses.View",
                "Orders.View", "Customers.View",
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
                "Products.View", "POS.View", "POS.Add",
                "Orders.View", "Orders.Add",
                "Customers.View", "Customers.Add",
                "Invoices.View", "Invoices.Add"
            },

            ["InventoryManager"] = new[]
            {
                "Products.View", "Products.Add", "Products.Edit",
                "Categories.View", "Categories.Add", "Categories.Edit",
                "Warehouses.View", "Warehouses.Add", "Warehouses.Edit",
                "StockTransfer.View", "StockTransfer.Add", "StockTransfer.Edit",
                "DamagedStock.View", "DamagedStock.Add",
                "Orders.View"
            },

            ["OrdersManager"] = new[]
            {
                "Products.View", "Orders.View", "Orders.Add", "Orders.Edit",
                "Coupons.View", "Customers.View", "Customers.Add", "Customers.Edit",
                "POS.View", "Warehouses.View", "ShippingCompanies.View"
            },

            ["Marketing"] = new[]
            {
                "Products.View", "Products.Edit",
                "Categories.View", "Orders.View",
                "Coupons.View", "Coupons.Add", "Coupons.Edit",
                "Customers.View"
            },
        };

        var rolePermissions = new List<RolePermission>();
        foreach (var map in rolePermissionMap)
        {
            var roleId = roleByName[map.Key];
            foreach (var code in map.Value)
            {
                if (permByCode.TryGetValue(code, out var permId))
                {
                    rolePermissions.Add(new RolePermission { RoleId = roleId, PermissionId = permId });
                }
            }
        }
        await context.RolePermissions.AddRangeAsync(rolePermissions);
        await context.SaveChangesAsync();
    }

    private static async Task SeedPackagesAsync(AppDbContext context)
    {
        if (await context.Packages.AnyAsync()) return; 

        const int Unlimited = -1;

        var packages = new List<Package>
        {
            new()
            {
                PackageName = "المجانية",
                MonthlyPrice = 0,
                MaxProducts = 20,
                MaxOrdersPerMonth = 30,
                MaxEmployees = 1,
                MaxWarehouses = 1,
                MaxBranchesPOS = 0,
                MaxPaymentGateways = 1,
                MaxShippingCompanies = 0,
                HasAccountingFull = false,
                HasPayroll = false,
                HasZatcaInvoice = false,
                HasCustomDomain = false,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                MaxThemes = 1,
                CommissionPercentage = 0,
                IsActive = true
            },
            new()
            {
                PackageName = "الإنطلاق",
                MonthlyPrice = 99,
                MaxProducts = 500,
                MaxOrdersPerMonth = 500,
                MaxEmployees = 3,
                MaxWarehouses = 2,
                MaxBranchesPOS = 1,
                MaxPaymentGateways = 2,
                MaxShippingCompanies = 1,
                HasAccountingFull = false,
                HasPayroll = false,
                HasZatcaInvoice = true,
                HasCustomDomain = false,
                HasAffiliateMarketing = false,
                HasApiAccess = false,
                MaxThemes = 2,
                CommissionPercentage = 5,
                IsActive = true
            },
            new()
            {
                PackageName = "التوسع",
                MonthlyPrice = 249,
                MaxProducts = 5000,
                MaxOrdersPerMonth = 5000,
                MaxEmployees = 10,
                MaxWarehouses = 5,
                MaxBranchesPOS = 3,
                MaxPaymentGateways = Unlimited,
                MaxShippingCompanies = 3,
                HasAccountingFull = true,
                HasPayroll = true,
                HasZatcaInvoice = true,
                HasCustomDomain = true,
                HasAffiliateMarketing = true,
                HasApiAccess = false,
                MaxThemes = 3,
                CommissionPercentage = 3,
                IsActive = true
            },
            new()
            {
                PackageName = "الريادة",
                MonthlyPrice = 499,
                MaxProducts = null,
                MaxOrdersPerMonth = null,
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
                MaxThemes = 3,
                CommissionPercentage = 5,
                IsActive = true
            }
        };

        await context.Packages.AddRangeAsync(packages);
        await context.SaveChangesAsync();
    }

    private static async Task SeedSuperAdminAsync(AppDbContext context)
    {
        if (await context.Users.AnyAsync(u => u.Email == "admin@platform.com"))
            return;

        var superAdmin = new User
        {
            FullName = "منصة الإدارة",
            Email = "admin@platform.com",
            Phone = "0500000001",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123456"),
            UserType = UserType.SuperAdmin,
            IsActive = true,
            IsVerified = true
        };

        context.Users.Add(superAdmin);
        await context.SaveChangesAsync();
    }

    private static async Task SeedSiteContentAsync(AppDbContext context)
    {
        if (await context.Set<SitePage>().AnyAsync()) return;

        context.Set<SitePage>().AddRange(
            new SitePage { PageKey = "about", TitleAr = "عن المنصة", TitleEn = "About Us", ContentAr = "<h2>فاتورة راحتك</h2><p>منصة سحابية متكاملة لإدارة المتاجر الإلكترونية، توفر حلولاً شاملة من إنشاء المتجر وإدارة المنتجات والمخزون إلى النظام المحاسبي الكامل والفواتير الإلكترونية.</p><p>نهدف إلى تمكين رواد الأعمال في المملكة العربية السعودية من إدارة أعمالهم بكفاءة واحترافية من خلال أدوات سهلة الاستخدام ومتكاملة.</p>", ContentEn = "<h2>FatooraRahatak</h2><p>A comprehensive SaaS platform for e-commerce management.</p>" },
            new SitePage { PageKey = "help-center", TitleAr = "مركز المساعدة", TitleEn = "Help Center", ContentAr = "<h2>مرحبًا بك في مركز المساعدة</h2><p>هذا المركز قيد الإعداد حاليًا. سنوفر قريبًا أدلة وشروحات مفصلة لكل أجزاء المنصة.</p>", ContentEn = "<h2>Welcome to Help Center</h2><p>Coming soon.</p>" }
        );

        context.Set<SiteFaqItem>().AddRange(
            new SiteFaqItem { QuestionAr = "هل الباقة المجانية مجانية للأبد؟", QuestionEn = "Is the free plan free forever?", AnswerAr = "نعم، الباقة المجانية مجانية مدى الحياة بدون أي رسوم مخفية.", AnswerEn = "Yes, the free plan is free forever with no hidden fees.", DisplayOrder = 1 },
            new SiteFaqItem { QuestionAr = "هل يمكنني تغيير باقتي في أي وقت؟", QuestionEn = "Can I change my plan anytime?", AnswerAr = "نعم، يمكنك الترقية في أي وقت فوريًا. الترقية من باقة أعلى إلى أقل تتطلب خفض استخدامك أولاً.", AnswerEn = "Yes, you can upgrade anytime instantly. Downgrading requires reducing your usage first.", DisplayOrder = 2 },
            new SiteFaqItem { QuestionAr = "هل النظام متوافق مع الفاتورة الإلكترونية ZATCA؟", QuestionEn = "Is the system ZATCA compliant?", AnswerAr = "نعم، المنصة تدعم الفاتورة الإلكترونية (المرحلة الثانية) مع QR Code والتوقيع الرقمي.", AnswerEn = "Yes, the platform supports e-invoicing (phase 2) with QR Code and digital signature.", DisplayOrder = 3 },
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
            new SitePage { PageKey = "about", TitleAr = "عن المنصة", TitleEn = "About Us", ContentAr = "<h2>فاتورة راحتك</h2><p>منصة سحابية متكاملة لإدارة المتاجر الإلكترونية، توفر حلولاً شاملة من إنشاء المتجر وإدارة المنتجات والمخزون إلى النظام المحاسبي الكامل والفواتير الإلكترونية.</p><p>نهدف إلى تمكين رواد الأعمال في المملكة العربية السعودية من إدارة أعمالهم بكفاءة واحترافية من خلال أدوات سهلة الاستخدام ومتكاملة.</p>", ContentEn = "<h2>FatooraRahatak</h2><p>A comprehensive SaaS platform for e-commerce management.</p>" },
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
}