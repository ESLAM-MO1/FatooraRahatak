namespace FatooraRahatak.Application.Common;

public static class PackageLimitHelper
{
    public const int Unlimited = -1;

    public static bool IsUnlimited(int? limit) => !limit.HasValue || limit.Value == Unlimited;

    public static bool IsUnlimited(int limit) => limit == Unlimited;

    public static bool IsWithinLimit(int? limit, int currentCount)
    {
        if (IsUnlimited(limit)) return true;
        return currentCount < limit!.Value;
    }

    public static bool IsWithinLimit(int limit, int currentCount)
    {
        if (IsUnlimited(limit)) return true;
        return currentCount < limit;
    }

    public static bool ExceedsLimit(int? limit, int currentCount)
    {
        if (IsUnlimited(limit)) return false;
        return currentCount > limit!.Value;
    }

    public static bool ExceedsLimit(int limit, int currentCount)
    {
        if (IsUnlimited(limit)) return false;
        return currentCount > limit;
    }
}
