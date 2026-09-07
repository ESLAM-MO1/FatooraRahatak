using System.Reflection;
using QuestPDF.Drawing;
using QuestPDF.Infrastructure;

namespace FatooraRahatak.Infrastructure.Services;

/// <summary>
/// تسجيل خط Cairo العربي المضمّن داخل التطبيق لاستخدامه في توليد كل ملفات الـ PDF.
/// خط Arial كان يُستخدم سابقًا ولا يحوي جليفات عربية في بيئة الرندر (Linux/سيرفر)
/// فكانت النصوص العربية تظهر "؟؟؟؟؟". Cairo خط عربي كامل (SIL OFL) مضمّن كـ
/// EmbeddedResource — بلا اعتماد على خط النظام.
/// </summary>
public static class PdfFonts
{
    public const string ArabicFontFamily = "Cairo";

    private static bool _registered;

    /// <summary>يسجّل الخط مرة واحدة (آمن للتكرار). يُستدعى قبل توليد أي PDF.</summary>
    public static void EnsureRegistered()
    {
        if (_registered) return;
        lock (typeof(PdfFonts))
        {
            if (_registered) return;

            var assembly = Assembly.GetExecutingAssembly();
            const string resourceName = "FatooraRahatak.Infrastructure.Fonts.Cairo.ttf";

            using var stream = assembly.GetManifestResourceStream(resourceName)
                ?? throw new InvalidOperationException($"لم يتم العثور على الخط المضمّن: {resourceName}");

            // نسخة تدفق قابلة للتكرار: QuestPDF قد يقرأ التدفق أكثر من مرة.
            using var ms = new MemoryStream();
            stream.CopyTo(ms);
            ms.Position = 0;

            FontManager.RegisterFontWithCustomName(ArabicFontFamily, ms);
            _registered = true;
        }
    }
}
