using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Infrastructure.Data.Seed;

/// <summary>
/// القالب الافتراضي لشجرة الحسابات (أساسي شامل قابل للتوسع) — يُولّد لكل متجر جديد.
/// يُبنى كـ Graph (جذور + SubAccounts) فيحفظه EF Core في SaveChanges واحد ويحل الـ FKs تلقائيًا.
/// </summary>
public static class DefaultChartOfAccounts
{
    public static List<Account> Build(long storeId)
    {
        Account Node(string code, string name, AccountType type, params Account[] children)
            => new Account
            {
                StoreId = storeId,
                Code = code,
                NameAr = name,
                AccountType = type,
                IsSystem = true,
                IsActive = true,
                SubAccounts = children.ToList()
            };

        return new List<Account>
        {
            Node("1", "الأصول", AccountType.Asset,
                Node("1101", "الصندوق (النقدية)", AccountType.Asset),
                Node("1102", "البنك", AccountType.Asset),
                Node("1103", "العملاء (ذمم مدينة)", AccountType.Asset),
                Node("1104", "المخزون", AccountType.Asset),
                Node("1105", "ضريبة القيمة المضافة على المشتريات", AccountType.Asset),
                Node("1201", "الأصول الثابتة", AccountType.Asset),
                Node("1202", "مجمع إهلاك الأصول الثابتة", AccountType.Asset)
            ),
            Node("2", "الخصوم", AccountType.Liability,
                Node("2101", "الموردون (ذمم دائنة)", AccountType.Liability),
                Node("2102", "ضريبة القيمة المضافة على المبيعات", AccountType.Liability),
                Node("2103", "رواتب مستحقة الدفع", AccountType.Liability),
                Node("2104", "التزام مستحق للتاجر (المنصة)", AccountType.Liability)
            ),
            Node("3", "حقوق الملكية", AccountType.Equity,
                Node("3101", "رأس المال", AccountType.Equity),
                Node("3102", "الأرباح المحتجزة", AccountType.Equity)
            ),
            Node("4", "الإيرادات", AccountType.Revenue,
                Node("4101", "إيرادات المبيعات", AccountType.Revenue),
                Node("4102", "إيرادات فرق الوردية (زيادة)", AccountType.Revenue),
                Node("4103", "إيرادات الشحن", AccountType.Revenue),
                Node("4104", "إيراد فائض الجرد", AccountType.Revenue)
            ),
            Node("5", "المصروفات", AccountType.Expense,
                Node("5101", "تكلفة البضاعة المباعة", AccountType.Expense),
                Node("5102", "مصروف الرواتب", AccountType.Expense),
                Node("5103", "مصروف الإهلاك", AccountType.Expense),
                Node("5104", "مصروفات عمومية وإدارية", AccountType.Expense),
                Node("5105", "مصروف فرق الوردية (عجز)", AccountType.Expense),
                Node("5106", "مصروف عمولة المنصة", AccountType.Expense),
                Node("5107", "مصروف التالف", AccountType.Expense),
                Node("5108", "مصروف عجز الجرد", AccountType.Expense),
                Node("5109", "مصروف شحن تدفعه المنصة", AccountType.Expense)
            )
        };
    }
}