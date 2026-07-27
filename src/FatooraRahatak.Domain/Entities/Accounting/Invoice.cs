using FatooraRahatak.Domain.Common;
using FatooraRahatak.Domain.Entities.Payments;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Users;
using FatooraRahatak.Domain.Enums;

namespace FatooraRahatak.Domain.Entities.Accounting;

// فاتورة بيع أو شراء — كيان مستقل حاليًا (غير مربوط تلقائيًا بطلبات معلم 2، قرار مُحسم في ملف تاسكات معلم 3)
public class Invoice : BaseEntity
{
    public long StoreId { get; set; }
    public InvoiceType InvoiceType { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty; // فريد داخل المتجر، مُولَّد تلقائيًا
    public DateOnly InvoiceDate { get; set; }

    // بيع: عميل مسجّل (اختياري) أو اسم ضيف نصي. شراء: اسم المورد نصيًا (لا يوجد كيان Supplier في المشروع بعد)
    public long? CustomerId { get; set; }
    public string? PartyName { get; set; }

    public InvoicePaymentMethod PaymentMethod { get; set; }
    public PaymentStatus PaymentStatus { get; set; } = PaymentStatus.Pending;

    public decimal SubTotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    // ⚠️ قرار هندسي (تاسك 7): يُخزَّن على مستوى الفاتورة (لفواتير البيع فقط) لتفادي إعادة الحساب لاحقًا
    public decimal? CostOfGoodsSold { get; set; }

    public long CreatedByUserId { get; set; }
    public long? JournalEntryId { get; set; }

    public Store Store { get; set; } = null!;
    public User? Customer { get; set; }
    public User CreatedBy { get; set; } = null!;
    public JournalEntry? JournalEntry { get; set; }
    public ICollection<InvoiceItem> Items { get; set; } = new List<InvoiceItem>();
    public Payment? Payment { get; set; }
}