namespace FatooraRahatak.Application.DTOs.Apps;

// ── بناء تطبيق الجوال (APK) عبر GitHub Actions ──

// حالة عملية بناء واحدة.
public class AppBuildDto
{
    public long Id { get; set; }
    public long StoreId { get; set; }
    public long StoreAppSubscriptionId { get; set; }
    public string? StoreName { get; set; }
    public string? AppName { get; set; }

    // Queued / Running / Succeeded / Failed.
    public string Status { get; set; } = "Queued";

    public long? GithubRunId { get; set; }
    public string? GithubRunUrl { get; set; }
    public string? PackageName { get; set; }
    public string? VersionName { get; set; }

    // متاح للتحميل فقط عند Status = Succeeded.
    public bool IsApkReady { get; set; }
    public long? ApkSizeBytes { get; set; }
    public string? ApkSha256 { get; set; }
    public string? DownloadUrl { get; set; }

    public string? ErrorMessage { get; set; }
    public string? LogTail { get; set; }

    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
