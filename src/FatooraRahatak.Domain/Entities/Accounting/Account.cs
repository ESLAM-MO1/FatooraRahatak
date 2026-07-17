using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;

namespace FatooraRahatak.Domain.Entities.Accounting;

// حساب في شجرة الحسابات (Chart of Accounts) — هرمي (Self-referencing)
public class Account : BaseEntity
{
    public long StoreId { get; set; }
    public string Code { get; set; } = string.Empty;   // رقم الحساب (فريد داخل المتجر)
    public string NameAr { get; set; } = string.Empty;  // اسم الحساب
    public AccountType AccountType { get; set; }
    public long? ParentAccountId { get; set; }           // الحساب الأب (null = حساب جذري)
    public bool IsActive { get; set; } = true;
    public bool IsSystem { get; set; } = false;          // حسابات القالب الافتراضي — لا تُحذف

    // ملاحظة: لا يوجد حقل Balance عمدًا — الرصيد يُحسب ديناميكيًا من دفتر الأستاذ (تاسك 5)
    public Store Store { get; set; } = null!;
    public Account? ParentAccount { get; set; }
    public ICollection<Account> SubAccounts { get; set; } = new List<Account>();
}