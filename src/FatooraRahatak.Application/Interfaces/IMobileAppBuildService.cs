namespace FatooraRahatak.Application.Interfaces;

using FatooraRahatak.Application.DTOs.Apps;

// خدمة بناء تطبيق الجوال (APK) عبر GitHub Actions.
// تُجمّع بيانات المتجر وتصميمه، تُطلق workflow البناء على GitHub،
// تتابع حالته، ثم تسحب ملف APK الناتج وتضعه على السيرفر.
public interface IMobileAppBuildService
{
    // إطلاق بناء جديد لاشتراك التطبيق (يُستدعى من الأدمن).
    Task<AppBuildDto> StartBuildAsync(long storeAppSubscriptionId, long adminUserId);

    // تحديث حالة بناء معيّن بسحب آخر نتيجة من GitHub (استدعاء عند الطلب).
    Task<AppBuildDto> RefreshBuildAsync(long buildId);

    // أحدث بناء لاشتراك معيّن (لعرض الحالة في الواجهة).
    Task<AppBuildDto?> GetLatestBuildAsync(long storeAppSubscriptionId);

    // قائمة كل عمليات البناء (إدارية).
    Task<List<AppBuildDto>> GetAllBuildsAsync(string? status);

    // مسار ملف APK المبني مع التحقق من وجوده (للتحميل).
    Task<(string path, string fileName)?> GetApkFileAsync(long buildId);

    // الحصول على مسار APK للتحميل من قِبَل التاجر (للاشتراك الحالي).
    Task<AppBuildDto?> GetLatestForStoreAsync(long storeId);
}
