using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;

namespace FatooraRahatak.Domain.Entities.Accounting;

public class Voucher : BaseEntity
{
    public long StoreId { get; set; }
    public VoucherType VoucherType { get; set; }
    public string VoucherNumber { get; set; } = string.Empty; // فريد داخل المتجر، يُولَّد تلقائيًا
    public DateOnly VoucherDate { get; set; }
    public decimal Amount { get; set; }
    public VoucherPaymentMethod PaymentMethod { get; set; }

    // الحساب المقابل الذي يختاره المستخدم من شجرة الحسابات (عميل/مورد/مصروف/رأس مال... أي حساب)
    public long CounterpartAccountId { get; set; }

    // الطرف: اسم نصي اختياري + ربط اختياري بعميل مسجل (نفس نمط الفاتورة)
    public string? PartyName { get; set; }
    public long? CustomerId { get; set; }

    public string? Description { get; set; }

    public long CreatedByUserId { get; set; }
    public long? JournalEntryId { get; set; }

    public Store Store { get; set; } = null!;
    public Account CounterpartAccount { get; set; } = null!;
    public User? Customer { get; set; }
    public User CreatedBy { get; set; } = null!;
    public JournalEntry? JournalEntry { get; set; }
}