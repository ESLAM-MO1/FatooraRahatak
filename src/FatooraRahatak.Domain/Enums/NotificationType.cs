namespace FatooraRahatak.Domain.Enums;

// ⚠️ ملحوظة محدَّثة (معلم 3 — ربط الإشعارات، 2026-07-14): تبيّن عند التنفيذ إن
// كل القيم القديمة (بما فيها OrderCreated) لم تكن مربوطة فعليًا بأي حدث حقيقي —
// التعليق القديم كان صحيحًا. القيم الجديدة تحت مربوطة فعليًا الآن في
// AccountingService (فواتير/سندات/إهلاك/قيود/رواتب) و OrderService (الطلبات).
public enum NotificationType
{
    General,
    OrderCreated,
    OrderCancelled,
    OrderReturned,
    DomainActivated,
    LowStock,
    SubscriptionExpiring,
    SubscriptionSuspended,
    PackageActivated,
    InvoiceCreated,
    VoucherCreated,
    FixedAssetDepreciationPosted,
    JournalEntryPendingApproval,
    JournalEntryApproved,
    JournalEntryRejected,
    PayrollJournalEntryCreated,
    LeaveRequestCreated,
    LeaveRequestApproved,
    LeaveRequestRejected,
    StockCountCompleted,
    TicketReplied,
    TicketStatusChanged
}