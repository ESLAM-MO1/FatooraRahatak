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
            design.GetValueOrDefault("appName"),
            sub.AppName,
            store.StoreName,
            "متجري")!;
        var versionName = string.IsNullOrWhiteSpace(sub.CurrentAppVersion) ? "1.0.0" : sub.CurrentAppVersion!;

        var configJson = BuildAppConfigJson(
            appName: appName,
            tagline: design.GetValueOrDefault("tagline") ?? string.Empty,
            storeSlug: store.StoreSlug,
            currency: string.IsNullOrWhiteSpace(store.Currency) ? "SAR" : store.Currency,
            packageName: packageName,
            versionName: versionName,
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
            var payload = new
            {
                event_type = "build-store-apk",
                client_payload = new Dictionary<string, object>
                {
                    ["store_id"] = store.Id.ToString(),
                    ["app_name"] = appName,
                    ["package_name"] = packageName,
                    ["version_name"] = versionName,
                    ["config_json"] = configJson,
                    ["icon_url"] = sub.ListingIconUrl ?? string.Empty
                }
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
        foreach (var a in artifacts.EnumerateArray())
        {
            var name = a.TryGetProperty("name", out var n) ? n.GetString() : null;
            if (name != null && name.Contains($"store-apk-{build.StoreId}"))
            {
                artifactId = a.GetProperty("id").GetInt64();
                break;
            }
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
        return true;
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

    // يقرأ DesignJson (JSON) ويعيد قيمًا مفتاحية نصية.
    private static Dictionary<string, string> ParseDesign(string? designJson)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        if (string.IsNullOrWhiteSpace(designJson)) return result;
        try
        {
            using var doc = JsonDocument.Parse(designJson);
            foreach (var p in doc.RootElement.EnumerateObject())
            {
                if (p.Value.ValueKind == JsonValueKind.String)
                    result[p.Name] = p.Value.GetString() ?? string.Empty;
            }
        }
        catch { /* تصميم غير صالح للـ JSON: نتجاهله */ }
        return result;
    }

    private string BuildAppConfigJson(
        string appName, string tagline, string storeSlug, string currency,
        string packageName, string versionName, Dictionary<string, string> design, long storeId)
    {
        // استخراج الألوان من التصميم إن وُجدت، وإلا الألوان الافتراضية.
        var colors = new Dictionary<string, string>
        {
            ["headerColor"] = design.GetValueOrDefault("headerColor") ?? "#0b5e78",
            ["buttonColor"] = design.GetValueOrDefault("buttonColor") ?? "#12a8db",
            ["accentColor"] = design.GetValueOrDefault("accentColor") ?? "#1fb983",
            ["heroFrom"] = design.GetValueOrDefault("heroFrom") ?? design.GetValueOrDefault("buttonColor") ?? "#12a8db",
            ["heroTo"] = design.GetValueOrDefault("heroTo") ?? design.GetValueOrDefault("headerColor") ?? "#0b5e78",
            ["footerColor"] = design.GetValueOrDefault("footerColor") ?? "#1f2937",
        };

        var screens = new Dictionary<string, bool>
        {
            ["home"] = GetBool(design, "screenHome", true),
            ["catalog"] = GetBool(design, "screenCatalog", true),
            ["product"] = GetBool(design, "screenProduct", true),
            ["cart"] = GetBool(design, "screenCart", true),
            ["account"] = GetBool(design, "screenAccount", true),
            ["tracking"] = GetBool(design, "screenTracking", true),
        };

        var config = new Dictionary<string, object>
        {
            ["appName"] = appName,
            ["tagline"] = tagline,
            ["storeSlug"] = storeSlug,
            ["apiBaseUrl"] = ApiBaseUrl,
            ["currency"] = currency,
            ["packageName"] = packageName,
            ["versionName"] = versionName,
            ["iconUrl"] = design.GetValueOrDefault("iconUrl") ?? string.Empty,
            ["splashText"] = design.GetValueOrDefault("splashText") ?? string.Empty,
            ["colors"] = colors,
            ["screens"] = screens,
        };
        return JsonSerializer.Serialize(config);
    }

    private static bool GetBool(Dictionary<string, string> d, string key, bool fallback)
    {
        if (!d.TryGetValue(key, out var v)) return fallback;
        return v.Equals("true", StringComparison.OrdinalIgnoreCase) || v == "1";
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
