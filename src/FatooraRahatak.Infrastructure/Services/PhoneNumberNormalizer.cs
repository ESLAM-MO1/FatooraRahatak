using System.Linq;

namespace FatooraRahatak.Infrastructure.Services;

// ⚠️ نقطة تطبيع موحّدة لرقم الجوال تُستخدم في كل مكان بالمشروع يقارن أرقام جوال
// (QuickLoginService، OrderService، PublicStoreService...).
// السبب: كانت كل خدمة بتعمل تطبيع مختلف — بعضها بيشيل الأصفار البادئة بس (بدون
// إزالة كود الدولة الحقيقي مثل 966/20/1)، وبعضها بيشيل كود الدولة فعليًا.
// النتيجة: رقم نفسه بصيغتين مختلفتين (مثلاً "1008498714" و"+201008498714")
// كان يتطابق في مكان (QuickLogin) ويفشل في مكان تاني (التحقق من الطلب/الإرجاع)
// رغم إنه نفس الرقم تمامًا. الحل: نقطة تطبيع واحدة يستخدمها الجميع.
public static class PhoneNumberNormalizer
{
    // رموز الدول الشائعة مرتبة من الأطول إلى الأقصر (لتفادي قطع كود قصير غلط من رقم كوده أطول)
    private static readonly string[] CountryCodes = new[]
    {
        "966", "212", "213", "216", "218", "249", "971", "974", "965", "973", "968", "962", "963", "961",
        "234", "20", "92", "91", "62", "63", "60", "65", "66", "84", "90", "94", "44", "33", "49", "39",
        "34", "31", "48", "46", "47", "45", "43", "41", "55", "61", "64", "27", "1"
    };

    /// <summary>
    /// يرجّع رقم الجوال بعد تنظيفه من أي رموز غير رقمية، وإزالة كود الدولة (إن وُجد)
    /// وأي أصفار بادئة، بحيث تكون نفس الأرقام دايمًا نفس الناتج بغض النظر عن الصيغة
    /// التي أُدخلت بها (+966..، 00966..، 0..، أو بدون أي بادئة على الإطلاق).
    /// </summary>
    public static string Normalize(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return "";

        var trimmed = phone.Trim();
        var hadExplicitCountryCode = trimmed.StartsWith("+") || trimmed.StartsWith("00");

        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("00"))
        {
            digits = digits.Substring(2);
            hadExplicitCountryCode = true;
        }

        if (hadExplicitCountryCode)
        {
            digits = StripCountryCode(digits);
        }

        return digits.TrimStart('0');
    }

    public static bool AreEqual(string? phoneA, string? phoneB)
    {
        var a = Normalize(phoneA);
        var b = Normalize(phoneB);
        return a.Length > 0 && a == b;
    }

    private static string StripCountryCode(string digits)
    {
        foreach (var code in CountryCodes)
        {
            // شرط الطول (code.Length + 6) يمنع قطع كود من رقم محلي قصير أصلاً بالصدفة
            if (digits.StartsWith(code) && digits.Length > code.Length + 6)
                return digits.Substring(code.Length);
        }
        return digits;
    }
}