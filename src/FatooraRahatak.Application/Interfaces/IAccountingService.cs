using FatooraRahatak.Application.DTOs.Accounting;

namespace FatooraRahatak.Application.Interfaces;

public interface IAccountingService
{
    Task<List<AccountDto>> GetAccountsTreeAsync(long ownerUserId);
    Task<AccountDto> CreateAccountAsync(long ownerUserId, CreateAccountDto dto);
    Task<AccountDto> UpdateAccountAsync(long ownerUserId, long accountId, UpdateAccountDto dto);
    Task DeleteAccountAsync(long ownerUserId, long accountId);


    Task<JournalEntryDto> CreateJournalEntryAsync(long userId, CreateJournalEntryDto dto);
    Task<List<JournalEntryDto>> GetJournalEntriesAsync(long userId, string? status, DateOnly? from, DateOnly? to);
    Task<JournalEntryDto> GetJournalEntryByIdAsync(long userId, long entryId);
    Task<JournalEntryDto> ApproveJournalEntryAsync(long userId, long entryId);
    Task<JournalEntryDto> RejectJournalEntryAsync(long userId, long entryId);
    Task<JournalEntryDto> ReverseJournalEntryAsync(long userId, long entryId);

    Task<LedgerDto> GetAccountLedgerAsync(long userId, long accountId, DateOnly? from, DateOnly? to);

    // ===== تاسك 7: فواتير البيع والشراء =====
    Task<InvoiceDto> CreateSalesInvoiceAsync(long userId, CreateSalesInvoiceDto dto);
    Task<InvoiceDto> CreatePurchaseInvoiceAsync(long userId, CreatePurchaseInvoiceDto dto);
    Task<List<InvoiceDto>> GetInvoicesAsync(long userId, string? invoiceType, DateOnly? from, DateOnly? to);
    Task<InvoiceDto> GetInvoiceByIdAsync(long userId, long invoiceId);
    Task<InvoiceDto> CreatePosSaleAsync(long userId, CreatePosSaleDto dto);
    Task<VoucherDto> CreateReceiptVoucherAsync(long userId, CreateVoucherDto dto);
    Task<VoucherDto> CreatePaymentVoucherAsync(long userId, CreateVoucherDto dto);
    Task<List<VoucherDto>> GetVouchersAsync(long userId, string? voucherType, DateOnly? from, DateOnly? to);

    // ===== تاسك 13: الأصول الثابتة + الإهلاك التلقائي =====
    Task<FixedAssetDto> CreateFixedAssetAsync(long userId, CreateFixedAssetDto dto);
    Task<List<FixedAssetDto>> GetFixedAssetsAsync(long userId);
    Task<List<DepreciationRunResultDto>> RunDepreciationAsync(long userId, RunDepreciationDto dto);
    Task<JournalEntryDto> CreatePayrollJournalEntryAsync(long storeId, long createdByUserId, string employeeName, decimal netSalary, DateOnly periodMonth);

    // ===== تاسك 17: التقارير المالية الأربعة =====
    Task<TrialBalanceDto> GetTrialBalanceAsync(long userId, DateOnly? from, DateOnly? to);
    Task<IncomeStatementDto> GetIncomeStatementAsync(long userId, DateOnly? from, DateOnly? to);
    Task<BalanceSheetDto> GetBalanceSheetAsync(long userId, DateOnly asOf);
    Task<CashFlowDto> GetCashFlowAsync(long userId, DateOnly? from, DateOnly? to);
}