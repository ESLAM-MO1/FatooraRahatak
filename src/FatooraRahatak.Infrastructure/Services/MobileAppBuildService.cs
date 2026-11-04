using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.DTOs.Apps;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Packages;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

// خدمة بناء تطبيق الجوال (APK) عبر GitHub Actions.
//
// المسار الكامل:
//   1. الأدمن يضغط "بناء APK".
//   2. تُجمَّع بيانات المتجر + تصميمه في ملف app_config.json.
//   3. يُطلَق workflow "Build Store APK" على GitHub (repository_dispatch).
//   4. تُتابع الحالة بالاستقصاء (polling) على runs.
//   5. عند النجاح يُنزَّل artifact الـ APK إلى السيرفر، ويُحسب SHA-256.
//   6. يُتاح الملف للتحميل من لوحة الأدمن ولوحة التاجر.
public class MobileAppBuildService : IMobileAppBuildService
{
    private readonly AppDbContext _context;
    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<MobileAppBuildService> _logger;

    // إعدادات GitHub (تُقرأ من appsettings أو متغيّرات البيئة القسم MobileAppBuilder).
    private string GithubToken => _config["MobileAppBuilder:GithubToken"] ?? string.Empty;
    private string GithubRepo => _config["MobileAppBuilder:GithubRepo"] ?? "ESLAM-MO1/FatooraRahatak";
    private string WorkflowFile => _config["MobileAppBuilder:WorkflowFile"] ?? "build-apk.yml";
    private string ApiBaseUrl => _config["MobileAppBuilder:ApiBaseUrl"] ?? "https://rahtk.sa";
    private string ArtifactsDir => _config["MobileAppBuilder:ArtifactsDir"]
        ?? "/var/www/vhosts/rahtk.sa/fatoora/app-artifacts";

    public MobileAppBuildService(
        AppDbContext context,
        HttpClient http,
        IConfiguration config,
        ILogger<MobileAppBuildService> logger)
    {
        _context = context;
        _http = http;
        _config = config;
        _logger = logger;
    }

    // ينشئ طلبًا مُهيّأً لـ GitHub API (رأس التوثيق لكل طلب لتفادي تعديل عميل مشترك).
    private HttpRequestMessage GhRequest(HttpMethod method, string path, HttpContent? content = null)
    {
        var req = new HttpRequestMessage(method, $"https://api.github.com{path}");
        req.Headers.UserAgent.ParseAdd("RahtkAppBuilder/1.0");
        req.Headers.Accept.ParseAdd("application/vnd.github+json");
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", GithubToken);
        if (content != null) req.Content = content;
        return req;
    }

    private async Task<HttpResponseMessage> GhSendAsync(HttpMethod method, string path, HttpContent? content = null)
    {
        using var req = GhRequest(method, path, content);
        return await _http.SendAsync(req);
    }

    // ── إطلاق بناء جديد ──
    public async Task<AppBuildDto> StartBuildAsync(long storeAppSubscriptionId, long adminUserId)
    {
        var sub = await _context.StoreAppSubscriptions
            .FirstOrDefaultAsync(s => s.Id == storeAppSubscriptionId)
            ?? throw new InvalidOperationException("اشتراك التطبيق غير موجود");

        // لا يبدأ بناء إلا بعد اعتماد النشر من الفريق.
        if (sub.PublishStatus != "Published" && sub.PublishStatus != "InReview" && sub.PublishStatus != "Submitted")
            throw new InvalidOperationException("لا يمكن البناء قبل إرسال التطبيق للإطلاق ومراجعته");

        // منع تشغيل أكثر من بناء نشط في الوقت نفسه لنفس الاشتراك.
        var active = await _context.StoreAppBuilds
            .AnyAsync(b => b.StoreAppSubscriptionId == storeAppSubscriptionId
                        && (b.Status == "Queued" || b.Status == "Running"));
        if (active)
            throw new InvalidOperationException("يوجد بناء قيد التنفيذ بالفعل لهذا التطبيق");

        var store = await _context.Stores
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.Id == sub.StoreId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var design = ParseDesign(sub.DesignJson);
        var packageName = BuildPackageName(store.StoreSlug, store.Id);
        var appName = FirstNonEmpty(
            design.AppName,
            sub.AppName,
            store.StoreName,
            "متجري")!;
        var versionName = string.IsNullOrWhiteSpace(sub.CurrentAppVersion) ? "1.0.0" : sub.CurrentAppVersion!;
        var iconUrl = FirstNonEmpty(design.IconUrl, sub.ListingIconUrl, store.Logo) ?? string.Empty;

        var configJson = BuildAppConfigJson(
            appName: appName,
            tagline: design.Tagline ?? string.Empty,
            storeSlug: store.StoreSlug,
            currency: string.IsNullOrWhiteSpace(store.Currency) ? "SAR" : store.Currency,
            packageName: packageName,
            versionName: versionName,
            iconUrl: iconUrl,
            design: design,
            storeId: store.Id);

        var build = new StoreAppBuild
        {
            StoreId = sub.StoreId,
            StoreAppSubscriptionId = sub.Id,
            Status = "Queued",
            PackageName = packageName,
            VersionName = versionName,
            TriggeredByUserId = adminUserId,
            StartedAt = DateTime.UtcNow
        };
        _context.StoreAppBuilds.Add(build);
        await _context.SaveChangesAsync();

        try
        {
            var hasKeystore = !string.IsNullOrWhiteSpace(sub.KeystoreBase64);
            var payloadDict = new Dictionary<string, object>
            {
                ["store_id"] = store.Id.ToString(),
                ["app_name"] = appName,
                ["package_name"] = packageName,
                ["version_name"] = versionName,
                ["config_json"] = configJson,
                ["icon_url"] = iconUrl,
                ["keystore_b64"] = sub.KeystoreBase64 ?? string.Empty,
                ["keystore_password"] = sub.KeystorePassword ?? string.Empty,
                ["key_alias"] = sub.KeyAlias ?? string.Empty,
                ["key_password"] = sub.KeyPassword ?? string.Empty,
            };
            var payload = new
            {
                event_type = "build-store-apk",
                client_payload = payloadDict
            };

            var res = await GhSendAsync(
                HttpMethod.Post,
                $"/repos/{GithubRepo}/dispatches",
                new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"));

            if (!res.IsSuccessStatusCode)
            {
                var body = await res.Content.ReadAsStringAsync();
                build.Status = "Failed";
                build.ErrorMessage = $"تعذّر إطلاق البناء على GitHub ({res.StatusCode}): {Trim(body, 500)}";
                build.FinishedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                return Map(build, null);
            }

            build.Status = "Running";
            await _context.SaveChangesAsync();

            // انتظر قليلًا ثم ابحث عن التشغيل الجديد لربطه.
            await Task.Delay(8000);
            await TryAttachRunAsync(build);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "فشل إطلاق بناء التطبيق للاشتراك {Id}", storeAppSubscriptionId);
            build.Status = "Failed";
            build.ErrorMessage = Trim(ex.Message, 1000);
            build.FinishedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }

        return Map(build, null);
    }

    // ── تحديث حالة بناء (سحب آخر نتيجة من GitHub وتنزيل الـ APK عند الجاهزية) ──
    public async Task<AppBuildDto> RefreshBuildAsync(long buildId)
    {
        var build = await _context.StoreAppBuilds.FirstOrDefaultAsync(b => b.Id == buildId)
            ?? throw new InvalidOperationException("سجلّ البناء غير موجود");

        if (build.Status == "Succeeded" || build.Status == "Failed")
            return Map(build, null);

        try
        {
            if (build.GithubRunId == null)
                await TryAttachRunAsync(build);

            if (build.GithubRunId != null)
                await PollRunAsync(build);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "تعذّر تحديث حالة البناء {Id}", buildId);
        }

        await _context.SaveChangesAsync();
        return Map(build, null);
    }

    private async Task TryAttachRunAsync(StoreAppBuild build)
    {
        var res = await GhSendAsync(
            HttpMethod.Get,
            $"/repos/{GithubRepo}/actions/workflows/{WorkflowFile}/runs?per_page=5&event=repository_dispatch");
        if (!res.IsSuccessStatusCode) return;

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        if (!doc.RootElement.TryGetProperty("workflow_runs", out var runs)) return;

        foreach (var run in runs.EnumerateArray())
        {
            var created = run.TryGetProperty("created_at", out var c) ? c.GetDateTime() : DateTime.MinValue;
            if (created < build.StartedAt!.Value.AddSeconds(-30)) continue;
            build.GithubRunId = run.GetProperty("id").GetInt64();
            build.GithubRunUrl = run.TryGetProperty("html_url", out var h) ? h.GetString() : null;
            break;
        }
    }

    private async Task PollRunAsync(StoreAppBuild build)
    {
        var res = await GhSendAsync(HttpMethod.Get, $"/repos/{GithubRepo}/actions/runs/{build.GithubRunId}");
        if (!res.IsSuccessStatusCode) return;

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        var status = root.TryGetProperty("status", out var s) ? s.GetString() : null;
        var conclusion = root.TryGetProperty("conclusion", out var con) && con.ValueKind != JsonValueKind.Null
            ? con.GetString() : null;

        if (status != "completed")
        {
            build.Status = "Running";
            return;
        }

        if (conclusion == "success")
        {
            var ok = await DownloadArtifactAsync(build);
            if (ok)
            {
                build.Status = "Succeeded";
                build.FinishedAt = DateTime.UtcNow;
            }
            else
            {
                build.Status = "Failed";
                build.ErrorMessage = "اكتمل البناء على GitHub لكن تعذّر تنزيل ملف الـ APK";
                build.FinishedAt = DateTime.UtcNow;
            }
        }
        else
        {
            build.Status = "Failed";
            build.ErrorMessage = $"فشل البناء على GitHub (conclusion: {conclusion})";
            build.FinishedAt = DateTime.UtcNow;
        }
    }

    private async Task<bool> DownloadArtifactAsync(StoreAppBuild build)
    {
        // ابحث عن artifact البناء.
        var res = await GhSendAsync(HttpMethod.Get, $"/repos/{GithubRepo}/actions/runs/{build.GithubRunId}/artifacts");
        if (!res.IsSuccessStatusCode) return false;

        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        if (!doc.RootElement.TryGetProperty("artifacts", out var artifacts)) return false;

        long? artifactId = null;
        long? keystoreArtifactId = null;
        foreach (var a in artifacts.EnumerateArray())
        {
            var name = a.TryGetProperty("name", out var n) ? n.GetString() : null;
            if (name == null) continue;
            if (name.Contains($"store-apk-{build.StoreId}"))
                artifactId = a.GetProperty("id").GetInt64();
            else if (name.Contains($"store-keystore-{build.StoreId}"))
                keystoreArtifactId = a.GetProperty("id").GetInt64();
        }
        if (artifactId == null) return false;

        // نزّل الـ zip (redirect إلى تخزين GitHub).
        using var dlReq = GhRequest(HttpMethod.Get, $"/repos/{GithubRepo}/actions/artifacts/{artifactId}/zip");
        var dl = await _http.SendAsync(dlReq, HttpCompletionOption.ResponseHeadersRead);
        if (!dl.IsSuccessStatusCode) return false;

        Directory.CreateDirectory(ArtifactsDir);
        var zipPath = Path.Combine(ArtifactsDir, $"build-{build.Id}.zip");
        await using (var fs = File.Create(zipPath))
        {
            await dl.Content.CopyToAsync(fs);
        }

        // فُكّ ضغط الـ APK.
        var outDir = Path.Combine(ArtifactsDir, $"build-{build.Id}");
        if (Directory.Exists(outDir)) Directory.Delete(outDir, true);
        System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, outDir);

        var apk = Directory.GetFiles(outDir, "*.apk", SearchOption.AllDirectories).FirstOrDefault();
        if (apk == null) return false;

        var finalApk = Path.Combine(ArtifactsDir, $"store-{build.StoreId}-{build.Id}.apk");
        File.Copy(apk, finalApk, true);
        File.Delete(zipPath);
        Directory.Delete(outDir, true);

        build.ApkPath = finalApk;
        build.ApkSizeBytes = new FileInfo(finalApk).Length;
        build.ApkSha256 = await ComputeSha256Async(finalApk);

        // إن كان البناء قد ولّد مفتاح توقيع جديدًا (أول بناء)، نُخزّنه للاستخدام في التحديثات القادمة.
        if (keystoreArtifactId != null)
            await TryPersistKeystoreAsync(build, keystoreArtifactId.Value);

        return true;
    }

    // ينزّل حزمة مفتاح التوقيع (jks + meta) ويخزّنها في الاشتراك لتفادي كسر تحديثات Play.
    private async Task TryPersistKeystoreAsync(StoreAppBuild build, long keystoreArtifactId)
    {
        var sub = await _context.StoreAppSubscriptions
            .FirstOrDefaultAsync(s => s.Id == build.StoreAppSubscriptionId);
        if (sub == null) return;
        if (!string.IsNullOrWhiteSpace(sub.KeystoreBase64)) return; // مخزّن مسبقًا

        using var dlReq = GhRequest(HttpMethod.Get, $"/repos/{GithubRepo}/actions/artifacts/{keystoreArtifactId}/zip");
        var dl = await _http.SendAsync(dlReq, HttpCompletionOption.ResponseHeadersRead);
        if (!dl.IsSuccessStatusCode) return;

        var zipPath = Path.Combine(ArtifactsDir, $"keystore-{build.Id}.zip");
        await using (var fs = File.Create(zipPath))
            await dl.Content.CopyToAsync(fs);

        var outDir = Path.Combine(ArtifactsDir, $"keystore-{build.Id}");
        if (Directory.Exists(outDir)) Directory.Delete(outDir, true);
        System.IO.Compression.ZipFile.ExtractToDirectory(zipPath, outDir);

        var jks = Directory.GetFiles(outDir, "*.jks", SearchOption.AllDirectories).FirstOrDefault();
        var meta = Directory.GetFiles(outDir, "keystore-meta.json", SearchOption.AllDirectories).FirstOrDefault();
        if (jks != null)
        {
            sub.KeystoreBase64 = Convert.ToBase64String(await File.ReadAllBytesAsync(jks));
            if (meta != null)
            {
                try
                {
                    using var md = JsonDocument.Parse(await File.ReadAllTextAsync(meta));
                    var r = md.RootElement;
                    sub.KeyAlias = r.TryGetProperty("alias", out var a) ? a.GetString() : sub.KeyAlias;
                    sub.KeyPassword = r.TryGetProperty("keyPassword", out var kp) ? kp.GetString() : sub.KeyPassword;
                    sub.KeystorePassword = r.TryGetProperty("storePassword", out var sp) ? sp.GetString() : sub.KeystorePassword;
                }
                catch { /* نتجاهل meta غير صالح */ }
            }
            if (string.IsNullOrWhiteSpace(sub.KeyAlias)) sub.KeyAlias = $"store{build.StoreId}";
            if (string.IsNullOrWhiteSpace(sub.KeystorePassword)) sub.KeystorePassword = "rahtk2026";
            if (string.IsNullOrWhiteSpace(sub.KeyPassword)) sub.KeyPassword = sub.KeystorePassword;
            sub.KeystoreCreatedAt = DateTime.UtcNow;
        }

        File.Delete(zipPath);
        try { Directory.Delete(outDir, true); } catch { }
    }

    private static async Task<string> ComputeSha256Async(string path)
    {
        using var sha = SHA256.Create();
        await using var fs = File.OpenRead(path);
        var hash = await sha.ComputeHashAsync(fs);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    // ── القراءة ──
    public async Task<AppBuildDto?> GetLatestBuildAsync(long storeAppSubscriptionId)
    {
        var b = await _context.StoreAppBuilds
            .AsNoTracking()
            .Where(x => x.StoreAppSubscriptionId == storeAppSubscriptionId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();
        return b == null ? null : Map(b, null);
    }

    public async Task<AppBuildDto?> GetLatestForStoreAsync(long storeId)
    {
        var b = await _context.StoreAppBuilds
            .AsNoTracking()
            .Where(x => x.StoreId == storeId)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();
        return b == null ? null : Map(b, null);
    }

    public async Task<List<AppBuildDto>> GetAllBuildsAsync(string? status)
    {
        var q = _context.StoreAppBuilds.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(b => b.Status == status);

        var builds = await q.OrderByDescending(b => b.CreatedAt).Take(200).ToListAsync();
        var storeIds = builds.Select(b => b.StoreId).Distinct().ToList();
        var stores = await _context.Stores.AsNoTracking()
            .Where(s => storeIds.Contains(s.Id))
            .Select(s => new { s.Id, s.StoreName })
            .ToDictionaryAsync(s => s.Id, s => s.StoreName);

        var subIds = builds.Select(b => b.StoreAppSubscriptionId).Distinct().ToList();
        var subs = await _context.StoreAppSubscriptions.AsNoTracking()
            .Where(s => subIds.Contains(s.Id))
            .Select(s => new { s.Id, s.AppName })
            .ToDictionaryAsync(s => s.Id, s => s.AppName);

        return builds.Select(b => Map(b,
            stores.GetValueOrDefault(b.StoreId),
            subs.GetValueOrDefault(b.StoreAppSubscriptionId))).ToList();
    }

    public async Task<(string path, string fileName)?> GetApkFileAsync(long buildId)
    {
        var b = await _context.StoreAppBuilds.AsNoTracking().FirstOrDefaultAsync(x => x.Id == buildId);
        if (b == null || b.Status != "Succeeded" || string.IsNullOrWhiteSpace(b.ApkPath)) return null;
        if (!File.Exists(b.ApkPath)) return null;
        return (b.ApkPath, $"app-store-{b.StoreId}-v{b.VersionName}.apk");
    }

    // ── مساعدات ──

    // يُشتقّ اسم الحزمة من رمز المتجر (slug): sa.rahtk.<slug>، مع تنظيف المحارف.
    private static string BuildPackageName(string? slug, long storeId)
    {
        var s = string.IsNullOrWhiteSpace(slug) ? $"store{storeId}" : slug!;
        s = Regex.Replace(s.ToLowerInvariant(), "[^a-z0-9]", "");
        if (string.IsNullOrEmpty(s) || char.IsDigit(s[0])) s = $"store{s}";
        // اسم الحزمة لا يبدأ بمحارف سُنّية من أرقام، ونُقصّ الطول.
        if (s.Length > 40) s = s[..40];
        return $"sa.rahtk.{s}";
    }

    // يحلّل DesignJson الحقيقي (بنية متداخلة) ويُخرج كائنًا موحّدًا جاهزًا للحقن في التطبيق.
    // البنية المتوقّعة:
    // { version, themeId, colors{6}, appName, tagline, iconUrl, splashText,
    //   bottomNav[], screens{ home{sections[{key,enabled}]}, product{enabled,items}, cart{...}, account{...}, tracking{...}, catalog{...} } }
    private sealed class ParsedDesign
    {
        public string? AppName { get; set; }
        public string? Tagline { get; set; }
        public string? IconUrl { get; set; }
        public string? SplashText { get; set; }
        public Dictionary<string, string> Colors { get; set; } = new();
        public List<string> BottomNav { get; set; } = new();
        public List<string> HomeSections { get; set; } = new();
        public HashSet<string> ScreensEnabled { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, Dictionary<string, bool>> ScreenItems { get; set; } = new(StringComparer.OrdinalIgnoreCase);
    }

    private static readonly string[] DefaultBottomNav = { "home", "categories", "cart", "account" };
    private static readonly string[] AllScreens = { "home", "catalog", "product", "cart", "account", "tracking" };
    private static readonly string[] AllHomeSections =
        { "hero", "categories", "banners", "featured", "newArrivals", "offers", "brands", "testimonials", "newsletter", "contact" };
    private static readonly string[] ScreenItemKeys_Product = { "photos", "price", "discount", "rating", "description", "addToCart", "related" };
    private static readonly string[] ScreenItemKeys_Cart = { "items", "coupon", "shipping", "total", "checkout" };
    private static readonly string[] ScreenItemKeys_Account = { "profile", "orders", "wishlist", "addresses", "support", "settings", "trackOrder" };
    private static readonly string[] ScreenItemKeys_Tracking = { "timeline", "courier" };
    private static readonly string[] ScreenItemKeys_Catalog = { "search", "categories", "grid" };

    private static Dictionary<string, string[]> ScreenItemSchema() => new(StringComparer.OrdinalIgnoreCase)
    {
        ["product"] = ScreenItemKeys_Product,
        ["cart"] = ScreenItemKeys_Cart,
        ["account"] = ScreenItemKeys_Account,
        ["tracking"] = ScreenItemKeys_Tracking,
        ["catalog"] = ScreenItemKeys_Catalog,
    };

    // يقرأ DesignJson (JSON) ويُخرجه ككائن موحّد مع كل قيم التصميم.
    private static ParsedDesign ParseDesign(string? designJson)
    {
        var pd = new ParsedDesign();
        if (string.IsNullOrWhiteSpace(designJson)) return pd;
        JsonElement root;
        try
        {
            using var doc = JsonDocument.Parse(designJson);
            root = doc.RootElement.Clone();
        }
        catch { return pd; }

        if (root.ValueKind != JsonValueKind.Object) return pd;

        // ── حقول مسطّحة ──
        pd.AppName = GetStr(root, "appName");
        pd.Tagline = GetStr(root, "tagline");
        pd.IconUrl = GetStr(root, "iconUrl");
        pd.SplashText = GetStr(root, "splashText");

        // ── الألوان ──
        if (root.TryGetProperty("colors", out var colors) && colors.ValueKind == JsonValueKind.Object)
        {
            foreach (var p in colors.EnumerateObject())
                if (p.Value.ValueKind == JsonValueKind.String)
                    pd.Colors[p.Name] = p.Value.GetString() ?? string.Empty;
        }

        // ── شريط التنقل السفلي (الترتيب) ──
        if (root.TryGetProperty("bottomNav", out var nav) && nav.ValueKind == JsonValueKind.Array)
        {
            foreach (var v in nav.EnumerateArray())
                if (v.ValueKind == JsonValueKind.String) pd.BottomNav.Add(v.GetString()!);
        }
        pd.ScreensEnabled.UnionWith(AllScreens); // افتراضيًا كل الشاشات مفعّلة

        // ── الشاشات ──
        if (root.TryGetProperty("screens", out var screens) && screens.ValueKind == JsonValueKind.Object)
        {
            // تفعيل/تعطيل الشاشات
            foreach (var s in screens.EnumerateObject())
            {
                if (s.Value.ValueKind == JsonValueKind.Object &&
                    s.Value.TryGetProperty("enabled", out var en) &&
                    en.ValueKind == JsonValueKind.False && !s.Name.Equals("home", StringComparison.OrdinalIgnoreCase))
                {
                    pd.ScreensEnabled.Remove(s.Name);
                }
            }

            // أقسام الشاشة الرئيسية (الترتيب + التفعيل)
            if (screens.TryGetProperty("home", out var home) && home.ValueKind == JsonValueKind.Object &&
                home.TryGetProperty("sections", out var sections) && sections.ValueKind == JsonValueKind.Array)
            {
                foreach (var sec in sections.EnumerateArray())
                {
                    if (sec.ValueKind != JsonValueKind.Object) continue;
                    var key = GetStr(sec, "key");
                    var enabled = !(sec.TryGetProperty("enabled", out var e) && e.ValueKind == JsonValueKind.False);
                    if (!string.IsNullOrEmpty(key) && Array.IndexOf(AllHomeSections, key) >= 0 && enabled)
                        pd.HomeSections.Add(key!);
                }
            }

            // عناصر الشاشات الداخلية
            foreach (var (screenKey, itemKeys) in ScreenItemSchema())
            {
                var map = new Dictionary<string, bool>(StringComparer.OrdinalIgnoreCase);
                foreach (var k in itemKeys) map[k] = true; // افتراضيًا مفعّل
                if (screens.TryGetProperty(screenKey, out var sc) && sc.ValueKind == JsonValueKind.Object &&
                    sc.TryGetProperty("items", out var items) && items.ValueKind == JsonValueKind.Object)
                {
                    foreach (var k in itemKeys)
                        if (items.TryGetProperty(k, out var iv) &&
                            (iv.ValueKind == JsonValueKind.True || iv.ValueKind == JsonValueKind.False))
                            map[k] = iv.ValueKind == JsonValueKind.True;
                }
                pd.ScreenItems[screenKey] = map;
            }
        }

        return pd;
    }

    private static string? GetStr(JsonElement obj, string name) =>
        obj.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    private string BuildAppConfigJson(
        string appName, string tagline, string storeSlug, string currency,
        string packageName, string versionName, string iconUrl,
        ParsedDesign design, long storeId)
    {
        // استخراج الألوان من التصميم إن وُجدت، وإلا الألوان الافتراضية.
        var colors = new Dictionary<string, string>
        {
            ["headerColor"] = design.Colors.GetValueOrDefault("headerColor") ?? "#0b5e78",
            ["buttonColor"] = design.Colors.GetValueOrDefault("buttonColor") ?? "#12a8db",
            ["accentColor"] = design.Colors.GetValueOrDefault("accentColor") ?? "#1fb983",
            ["heroFrom"] = design.Colors.GetValueOrDefault("heroFrom")
                          ?? design.Colors.GetValueOrDefault("buttonColor") ?? "#12a8db",
            ["heroTo"] = design.Colors.GetValueOrDefault("heroTo")
                        ?? design.Colors.GetValueOrDefault("headerColor") ?? "#0b5e78",
            ["footerColor"] = design.Colors.GetValueOrDefault("footerColor") ?? "#1f2937",
        };

        // شاشات مفعّلة (كل الشاشات + الرئيسية دائمًا).
        var screensEnabled = new Dictionary<string, bool>();
        foreach (var s in AllScreens)
            screensEnabled[s] = s == "home" || design.ScreensEnabled.Contains(s);

        // عناصر الشاشات الداخلية.
        var screenItems = new Dictionary<string, Dictionary<string, bool>>();
        foreach (var (k, v) in design.ScreenItems) screenItems[k] = v;

        // ترتيب شريط التنقل السفلي (نُبقي المنازل المفعّلة فقط، بترتيب التصميم).
        var bottomNav = design.BottomNav.Count > 0 ? design.BottomNav : DefaultBottomNav.ToList();

        // أقسام الشاشة الرئيسية (المفعّلة فقط، بترتيب التصميم)، وإلا الافتراضية.
        var homeSections = design.HomeSections.Count > 0
            ? design.HomeSections
            : new List<string> { "hero", "categories", "featured", "newArrivals", "offers" };

        var config = new Dictionary<string, object>
        {
            ["appName"] = appName,
            ["tagline"] = tagline,
            ["storeSlug"] = storeSlug,
            ["apiBaseUrl"] = ApiBaseUrl,
            ["currency"] = currency,
            ["packageName"] = packageName,
            ["versionName"] = versionName,
            ["iconUrl"] = iconUrl,
            ["splashText"] = design.SplashText ?? string.Empty,
            ["colors"] = colors,
            ["screens"] = screensEnabled,
            ["bottomNav"] = bottomNav,
            ["homeSections"] = homeSections,
            ["screenItems"] = screenItems,
        };
        return JsonSerializer.Serialize(config);
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static string Trim(string s, int max) =>
        s.Length <= max ? s : s[..max];

    private static AppBuildDto Map(StoreAppBuild b, string? storeName, string? appName = null) => new()
    {
        Id = b.Id,
        StoreId = b.StoreId,
        StoreAppSubscriptionId = b.StoreAppSubscriptionId,
        StoreName = storeName,
        AppName = appName,
        Status = b.Status,
        GithubRunId = b.GithubRunId,
        GithubRunUrl = b.GithubRunUrl,
        PackageName = b.PackageName,
        VersionName = b.VersionName,
        IsApkReady = b.Status == "Succeeded" && !string.IsNullOrWhiteSpace(b.ApkPath),
        ApkSizeBytes = b.ApkSizeBytes,
        ApkSha256 = b.ApkSha256,
        DownloadUrl = b.Status == "Succeeded" ? $"/api/v1/admin/app-builds/{b.Id}/download" : null,
        ErrorMessage = b.ErrorMessage,
        LogTail = b.LogTail,
        StartedAt = b.StartedAt,
        FinishedAt = b.FinishedAt,
        CreatedAt = b.CreatedAt,
    };
}
