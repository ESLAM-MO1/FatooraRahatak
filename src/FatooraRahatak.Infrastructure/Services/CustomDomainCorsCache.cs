using System.Collections.Concurrent;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// كاش ثابت في الذاكرة لأصول CORS الخاصة بالدومينات المخصصة المفعّلة.
/// يتحدّث فورًا عند تفعيل دومين جديد (SetCustomDomainDnsVerifiedAsync)
/// ويُعاد بناؤه بالكامل كل دقيقة كإجراء أمان (CustomDomainCorsRefreshService).
/// </summary>
public static class CustomDomainCorsCache
{
    private static readonly ConcurrentDictionary<string, byte> _origins = new();

    public static bool IsAllowed(string originHost)
    {
        return _origins.ContainsKey(originHost.TrimEnd('.').ToLowerInvariant());
    }

    public static void AddDomain(string domain)
    {
        var d = domain.Trim().ToLowerInvariant();
        _origins[$"https://{d}"] = 1;
        _origins[$"http://{d}"] = 1;
        if (!d.StartsWith("www."))
        {
            _origins[$"https://www.{d}"] = 1;
            _origins[$"http://www.{d}"] = 1;
        }
    }

    public static void RemoveDomain(string domain)
    {
        var d = domain.Trim().ToLowerInvariant();
        _origins.TryRemove($"https://{d}", out _);
        _origins.TryRemove($"http://{d}", out _);
        _origins.TryRemove($"https://www.{d}", out _);
        _origins.TryRemove($"http://www.{d}", out _);
    }

    public static void ReplaceAll(IEnumerable<string> domains)
    {
        var fresh = new List<string>();
        foreach (var domain in domains)
        {
            var d = domain.Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(d)) continue;
            fresh.Add($"https://{d}");
            fresh.Add($"http://{d}");
            if (!d.StartsWith("www."))
            {
                fresh.Add($"https://www.{d}");
                fresh.Add($"http://www.{d}");
            }
        }
        foreach (var o in fresh)
            _origins[o] = 1;

        // إزالة أي أصل قديم لم يعد موجودًا في القائمة الجديدة
        var freshSet = new HashSet<string>(fresh);
        foreach (var existing in _origins.Keys.ToList())
        {
            if (!freshSet.Contains(existing))
                _origins.TryRemove(existing, out _);
        }
    }
}
