using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs.Accounting;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Domain.Entities.Accounting;
using FatooraRahatak.Domain.Entities.Stores;
using FatooraRahatak.Domain.Entities.Inventory;
using FatooraRahatak.Domain.Entities.Products;
using FatooraRahatak.Domain.Enums;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class AccountingService : IAccountingService
{
    private readonly AppDbContext _context;
    private readonly INotificationService _notificationService;

    public AccountingService(AppDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    // نفس نمط StoreService: نحل المتجر من الـ Owner المسجّل دخوله
    private async Task<Store> GetOwnerStoreAsync(long ownerUserId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.OwnerUserId == ownerUserId);
        if (store == null)
            throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك بعد");
        return store;
    }

    private async Task<(long StoreId, string Role, string UserFullName)> ResolveStoreAndRoleAsync(long userId)
    {
        var ownedStore = await _context.Stores
            .Include(s => s.Owner)
            .FirstOrDefaultAsync(s => s.OwnerUserId == userId);
        if (ownedStore != null)
            return (ownedStore.Id, "Owner", ownedStore.Owner.FullName);

        var employee = await _context.Employees
            .Include(e => e.Role)
            .Include(e => e.User)
            .FirstOrDefaultAsync(e => e.UserId == userId && e.Status == "Active");
        if (employee != null)
            return (employee.StoreId, employee.Role.RoleName, employee.User.FullName);

        throw new InvalidOperationException("لا يوجد متجر مرتبط بحسابك، أو حسابك غير نشط");
    }

    // ⚠️ إضافة (ربط الإشعارات): يجيب الـ Owner الفعلي لمتجر معيّن عشان نبعتله الإشعار،
    // بغض النظر هل اللي نفّذ العملية هو الـ Owner نفسه أو موظف تابع له.
    private async Task<long> GetStoreOwnerUserIdAsync(long storeId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        return store?.OwnerUserId ?? 0;
    }

   public async Task<List<AccountDto>> GetAccountsTreeAsync(long userId)
{
    var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

    var accounts = await _context.Accounts
        .Where(a => a.StoreId == storeId)
        .OrderBy(a => a.Code)
        .ToListAsync();

    // كل حركات القيود المعتمدة لكل حسابات المتجر دي، عشان نحسب الرصيد ديناميكيًا
    var accountIds = accounts.Select(a => a.Id).ToList();

    var lines = await _context.Set<JournalEntryLine>()
        .Include(l => l.JournalEntry)
        .Where(l => accountIds.Contains(l.AccountId)
                 && l.JournalEntry.StoreId == storeId
                 && l.JournalEntry.Status == JournalEntryStatus.Approved)
        .Select(l => new { l.AccountId, l.Debit, l.Credit })
        .ToListAsync();

    var linesByAccount = lines
        .GroupBy(l => l.AccountId)
        .ToDictionary(g => g.Key, g => (Debit: g.Sum(x => x.Debit), Credit: g.Sum(x => x.Credit)));

    decimal ComputeBalance(Account a)
    {
        if (!linesByAccount.TryGetValue(a.Id, out var sums))
            return 0m;

        bool isDebitNormal = a.AccountType == AccountType.Asset || a.AccountType == AccountType.Expense;
        return isDebitNormal ? (sums.Debit - sums.Credit) : (sums.Credit - sums.Debit);
    }

    var dtos = accounts.ToDictionary(a => a.Id, a => new AccountDto
    {
        Id = a.Id,
        Code = a.Code,
        NameAr = a.NameAr,
        AccountType = a.AccountType.ToString(),
        ParentAccountId = a.ParentAccountId,
        IsActive = a.IsActive,
        IsSystem = a.IsSystem,
        Balance = ComputeBalance(a)
    });

    var roots = new List<AccountDto>();
    foreach (var a in accounts)
    {
        var dto = dtos[a.Id];
        if (a.ParentAccountId.HasValue && dtos.TryGetValue(a.ParentAccountId.Value, out var parent))
            parent.Children.Add(dto);
        else
            roots.Add(dto);
    }
    return roots;
}

    public async Task<AccountDto> CreateAccountAsync(long ownerUserId, CreateAccountDto dto)
    {
        var store = await GetOwnerStoreAsync(ownerUserId);

        if (string.IsNullOrWhiteSpace(dto.Code))
            throw new InvalidOperationException("يجب إدخال رقم الحساب");
        if (string.IsNullOrWhiteSpace(dto.NameAr))
            throw new InvalidOperationException("يجب إدخال اسم الحساب");

        var codeExists = await _context.Accounts
            .AnyAsync(a => a.StoreId == store.Id && a.Code == dto.Code.Trim());
        if (codeExists)
            throw new InvalidOperationException("رقم الحساب مستخدم بالفعل، اختر رقمًا آخر");

        if (dto.ParentAccountId.HasValue)
        {
            var parentExists = await _context.Accounts
                .AnyAsync(a => a.Id == dto.ParentAccountId.Value && a.StoreId == store.Id);
            if (!parentExists)
                throw new InvalidOperationException("الحساب الأب غير موجود");
        }

        var account = new Account
        {
            StoreId = store.Id,
            Code = dto.Code.Trim(),
            NameAr = dto.NameAr.Trim(),
            AccountType = dto.AccountType,
            ParentAccountId = dto.ParentAccountId,
            IsActive = true,
            IsSystem = false
        };
        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();

        return MapToDto(account);
    }

    public async Task<AccountDto> UpdateAccountAsync(long ownerUserId, long accountId, UpdateAccountDto dto)
    {
        var store = await GetOwnerStoreAsync(ownerUserId);

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.StoreId == store.Id);
        if (account == null)
            throw new InvalidOperationException("الحساب غير موجود");

        if (string.IsNullOrWhiteSpace(dto.NameAr))
            throw new InvalidOperationException("يجب إدخال اسم الحساب");

        account.NameAr = dto.NameAr.Trim();
        account.IsActive = dto.IsActive;
        account.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(account);
    }

    public async Task DeleteAccountAsync(long ownerUserId, long accountId)
    {
        var store = await GetOwnerStoreAsync(ownerUserId);

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.StoreId == store.Id);
        if (account == null)
            throw new InvalidOperationException("الحساب غير موجود");

        if (account.IsSystem)
            throw new InvalidOperationException("لا يمكن حذف حساب من القالب الافتراضي للنظام");

        var hasChildren = await _context.Accounts.AnyAsync(a => a.ParentAccountId == accountId);
        if (hasChildren)
            throw new InvalidOperationException("لا يمكن حذف حساب له حسابات فرعية، احذف الحسابات الفرعية أولاً");

        var hasMovements = await _context.Set<JournalEntryLine>().AnyAsync(l => l.AccountId == accountId);
        if (hasMovements)
            throw new InvalidOperationException("لا يمكن حذف حساب له حركات محاسبية مسجَّلة، يمكنك تعطيله بدلاً من ذلك");

        _context.Accounts.Remove(account);
        await _context.SaveChangesAsync();
    }

    private static AccountDto MapToDto(Account a) => new AccountDto
    {
        Id = a.Id,
        Code = a.Code,
        NameAr = a.NameAr,
        AccountType = a.AccountType.ToString(),
        ParentAccountId = a.ParentAccountId,
        IsActive = a.IsActive,
        IsSystem = a.IsSystem,
        Balance = 0m
    };

    // =====================================================================
    // تاسك 3: القيود اليومية (Journal Entries)
    // =====================================================================

    public async Task<JournalEntryDto> CreateJournalEntryAsync(long userId, CreateJournalEntryDto dto)
    {
        var (storeId, _, userName) = await ResolveStoreAndRoleAsync(userId);

        if (dto.Lines == null || dto.Lines.Count < 2)
            throw new InvalidOperationException("يجب إدخال سطرين على الأقل (مدين ودائن)");

        decimal totalDebit = 0m, totalCredit = 0m;
        var accountIds = dto.Lines.Select(l => l.AccountId).Distinct().ToList();
        var validAccountIds = await _context.Accounts
            .Where(a => a.StoreId == storeId && accountIds.Contains(a.Id) && a.IsActive)
            .Select(a => a.Id)
            .ToListAsync();

        foreach (var line in dto.Lines)
        {
            if (!validAccountIds.Contains(line.AccountId))
                throw new InvalidOperationException($"الحساب رقم {line.AccountId} غير موجود أو غير نشط في متجرك");

            var hasDebit = line.Debit > 0;
            var hasCredit = line.Credit > 0;
            if (hasDebit == hasCredit)
                throw new InvalidOperationException("كل سطر يجب أن يكون له مبلغ مدين أو دائن واحد فقط، وليس الاثنين معًا أو لا شيء");

            totalDebit += line.Debit;
            totalCredit += line.Credit;
        }

        if (totalDebit != totalCredit)
            throw new InvalidOperationException($"القيد غير متوازن: إجمالي المدين ({totalDebit}) لا يساوي إجمالي الدائن ({totalCredit})");

        if (totalDebit == 0)
            throw new InvalidOperationException("لا يمكن إنشاء قيد بقيمة صفرية");

        var entryNumber = await GenerateEntryNumberAsync(storeId);

        var entry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = dto.EntryDate,
            Description = dto.Description,
            Status = JournalEntryStatus.PendingApproval,
            CreatedByUserId = userId,
            IsAutoGenerated = false,
            SourceType = JournalSourceType.Manual,
            Lines = dto.Lines.Select(l => new JournalEntryLine
            {
                AccountId = l.AccountId,
                Debit = l.Debit,
                Credit = l.Credit,
                LineDescription = l.LineDescription
            }).ToList()
        };

        _context.Set<JournalEntry>().Add(entry);
        await _context.SaveChangesAsync();

        // ⚠️ إضافة (ربط الإشعارات) — إشعار الـ Owner بقيد جديد محتاج اعتماده
        try
        {
            var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
            if (ownerUserId != 0 && ownerUserId != userId)
            {
                await _notificationService.CreateAsync(
                    ownerUserId,
                    "قيد يومية جديد بانتظار الاعتماد",
                    $"تم إنشاء قيد رقم {entry.EntryNumber} بقيمة {totalDebit} ر.س، بانتظار اعتمادك",
                    NotificationType.JournalEntryPendingApproval,
                    $"/dashboard/accounting/journal-entries/{entry.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء القيد */ }

        return await GetJournalEntryByIdAsync(userId, entry.Id);
    }

    public async Task<List<JournalEntryDto>> GetJournalEntriesAsync(long userId, string? status, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var query = _context.Set<JournalEntry>()
            .Include(e => e.Lines).ThenInclude(l => l.Account)
            .Include(e => e.CreatedBy)
            .Include(e => e.ApprovedBy)
            .Where(e => e.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<JournalEntryStatus>(status, true, out var statusEnum))
        {
            query = query.Where(e => e.Status == statusEnum);
        }

        if (from.HasValue)
            query = query.Where(e => e.EntryDate >= from.Value);
        if (to.HasValue)
            query = query.Where(e => e.EntryDate <= to.Value);

        var entries = await query.OrderByDescending(e => e.EntryDate).ThenByDescending(e => e.Id).ToListAsync();
        return entries.Select(MapEntryToDto).ToList();
    }

    public async Task<JournalEntryDto> GetJournalEntryByIdAsync(long userId, long entryId)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var entry = await _context.Set<JournalEntry>()
            .Include(e => e.Lines).ThenInclude(l => l.Account)
            .Include(e => e.CreatedBy)
            .Include(e => e.ApprovedBy)
            .FirstOrDefaultAsync(e => e.Id == entryId && e.StoreId == storeId);

        if (entry == null)
            throw new InvalidOperationException("القيد غير موجود");

        return MapEntryToDto(entry);
    }

    public async Task<JournalEntryDto> ApproveJournalEntryAsync(long userId, long entryId)
    {
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

        if (role != "Owner")
            throw new InvalidOperationException("اعتماد القيود مسموح فقط لصاحب المتجر (Owner)");

        var entry = await _context.Set<JournalEntry>()
            .FirstOrDefaultAsync(e => e.Id == entryId && e.StoreId == storeId);
        if (entry == null)
            throw new InvalidOperationException("القيد غير موجود");

        if (entry.Status != JournalEntryStatus.PendingApproval)
            throw new InvalidOperationException("لا يمكن اعتماد قيد إلا وهو في حالة انتظار الاعتماد");

        if (entry.CreatedByUserId == userId)
            throw new InvalidOperationException("لا يمكنك اعتماد قيد قمت بإدخاله بنفسك (فصل المهام)");

        entry.Status = JournalEntryStatus.Approved;
        entry.ApprovedByUserId = userId;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // ⚠️ إضافة (ربط الإشعارات) — إشعار الشخص اللي أنشأ القيد (لو موظف) بإنه اتعمد
        try
        {
            if (entry.CreatedByUserId != userId)
            {
                await _notificationService.CreateAsync(
                    entry.CreatedByUserId,
                    "تم اعتماد القيد",
                    $"تم اعتماد قيد اليومية رقم {entry.EntryNumber}",
                    NotificationType.JournalEntryApproved,
                    $"/dashboard/accounting/journal-entries/{entry.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح الاعتماد */ }

        return await GetJournalEntryByIdAsync(userId, entryId);
    }

    public async Task<JournalEntryDto> RejectJournalEntryAsync(long userId, long entryId)
    {
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

        if (role != "Owner")
            throw new InvalidOperationException("رفض القيود مسموح فقط لصاحب المتجر (Owner)");

        var entry = await _context.Set<JournalEntry>()
            .FirstOrDefaultAsync(e => e.Id == entryId && e.StoreId == storeId);
        if (entry == null)
            throw new InvalidOperationException("القيد غير موجود");

        if (entry.Status != JournalEntryStatus.PendingApproval)
            throw new InvalidOperationException("لا يمكن رفض قيد إلا وهو في حالة انتظار الاعتماد");

        if (entry.CreatedByUserId == userId)
            throw new InvalidOperationException("لا يمكنك رفض قيد قمت بإدخاله بنفسك (فصل المهام)");

        entry.Status = JournalEntryStatus.Rejected;
        entry.ApprovedByUserId = userId;
        entry.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        // ⚠️ إضافة (ربط الإشعارات) — إشعار الشخص اللي أنشأ القيد (لو موظف) بإنه اترفض
        try
        {
            if (entry.CreatedByUserId != userId)
            {
                await _notificationService.CreateAsync(
                    entry.CreatedByUserId,
                    "تم رفض القيد",
                    $"تم رفض قيد اليومية رقم {entry.EntryNumber}",
                    NotificationType.JournalEntryRejected,
                    $"/dashboard/accounting/journal-entries/{entry.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح الرفض */ }

        return await GetJournalEntryByIdAsync(userId, entryId);
    }

    public async Task<JournalEntryDto> ReverseJournalEntryAsync(long userId, long entryId)
    {
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

        if (role != "Owner")
            throw new InvalidOperationException("عكس القيود مسموح فقط لصاحب المتجر (Owner)");

        var original = await _context.Set<JournalEntry>()
            .Include(e => e.Lines)
            .FirstOrDefaultAsync(e => e.Id == entryId && e.StoreId == storeId);
        if (original == null)
            throw new InvalidOperationException("القيد غير موجود");

        if (original.Status != JournalEntryStatus.Approved)
            throw new InvalidOperationException("لا يمكن عكس إلا قيد معتمد (Approved)");

        var alreadyReversed = await _context.Set<JournalEntry>()
            .AnyAsync(e => e.ReversalOfEntryId == original.Id);
        if (alreadyReversed)
            throw new InvalidOperationException("تم عكس هذا القيد من قبل بالفعل");

        var entryNumber = await GenerateEntryNumberAsync(storeId);

        var reversal = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = $"قيد عكسي للقيد رقم {original.EntryNumber}",
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = userId,
            ApprovedByUserId = userId,
            ReversalOfEntryId = original.Id,
            IsAutoGenerated = true,
            SourceType = original.SourceType,
            Lines = original.Lines.Select(l => new JournalEntryLine
            {
                AccountId = l.AccountId,
                Debit = l.Credit,
                Credit = l.Debit,
                LineDescription = l.LineDescription
            }).ToList()
        };

        _context.Set<JournalEntry>().Add(reversal);

        original.Status = JournalEntryStatus.Reversed;
        original.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetJournalEntryByIdAsync(userId, reversal.Id);
    }

    private async Task<string> GenerateEntryNumberAsync(long storeId)
    {
        var count = await _context.Set<JournalEntry>().CountAsync(e => e.StoreId == storeId);
        return $"JE-{(count + 1):D6}";
    }

    private static JournalEntryDto MapEntryToDto(JournalEntry e) => new JournalEntryDto
    {
        Id = e.Id,
        EntryNumber = e.EntryNumber,
        EntryDate = e.EntryDate,
        Description = e.Description,
        Status = e.Status.ToString(),
        CreatedByUserId = e.CreatedByUserId,
        CreatedByName = e.CreatedBy?.FullName ?? "",
        ApprovedByUserId = e.ApprovedByUserId,
        ApprovedByName = e.ApprovedBy?.FullName,
        ReversalOfEntryId = e.ReversalOfEntryId,
        IsAutoGenerated = e.IsAutoGenerated,
        SourceType = e.SourceType?.ToString(),
        TotalDebit = e.Lines.Sum(l => l.Debit),
        TotalCredit = e.Lines.Sum(l => l.Credit),
        Lines = e.Lines.Select(l => new JournalEntryLineDto
        {
            Id = l.Id,
            AccountId = l.AccountId,
            AccountCode = l.Account?.Code ?? "",
            AccountNameAr = l.Account?.NameAr ?? "",
            Debit = l.Debit,
            Credit = l.Credit,
            LineDescription = l.LineDescription
        }).ToList()
    };

    // =====================================================================
    // تاسك 5: دفتر الأستاذ العام (General Ledger)
    // =====================================================================

    public async Task<LedgerDto> GetAccountLedgerAsync(long userId, long accountId, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == accountId && a.StoreId == storeId);
        if (account == null)
            throw new InvalidOperationException("الحساب غير موجود");

        var allLines = await _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.AccountId == accountId
                     && l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved)
            .OrderBy(l => l.JournalEntry.EntryDate)
            .ThenBy(l => l.JournalEntry.Id)
            .ToListAsync();

        bool isDebitNormal = account.AccountType == AccountType.Asset || account.AccountType == AccountType.Expense;

        decimal SignedAmount(JournalEntryLine l) =>
            isDebitNormal ? (l.Debit - l.Credit) : (l.Credit - l.Debit);

        decimal openingBalance = from.HasValue
            ? allLines.Where(l => l.JournalEntry.EntryDate < from.Value).Sum(SignedAmount)
            : 0m;

        var periodLines = allLines.Where(l =>
            (!from.HasValue || l.JournalEntry.EntryDate >= from.Value) &&
            (!to.HasValue || l.JournalEntry.EntryDate <= to.Value));

        var movements = new List<LedgerMovementDto>();
        decimal running = openingBalance;
        foreach (var l in periodLines)
        {
            running += SignedAmount(l);
            movements.Add(new LedgerMovementDto
            {
                JournalEntryId = l.JournalEntryId,
                EntryNumber = l.JournalEntry.EntryNumber,
                EntryDate = l.JournalEntry.EntryDate,
                Description = l.JournalEntry.Description,
                LineDescription = l.LineDescription,
                Debit = l.Debit,
                Credit = l.Credit,
                RunningBalance = running,
                SourceType = l.JournalEntry.SourceType?.ToString()
            });
        }

        return new LedgerDto
        {
            AccountId = account.Id,
            AccountCode = account.Code,
            AccountNameAr = account.NameAr,
            AccountType = account.AccountType.ToString(),
            From = from,
            To = to,
            OpeningBalance = openingBalance,
            ClosingBalance = movements.Count > 0 ? movements[^1].RunningBalance : openingBalance,
            Movements = movements
        };
    }

    // =====================================================================
    // تاسك 7: فواتير البيع والشراء + توليد قيد تلقائي
    // =====================================================================

    // ⚠️ قرار هندسي: نسبة ضريبة القيمة المضافة السعودية القياسية 15%، مثبَّتة هنا مؤقتًا
    // لعدم وجود حقل VatRate قابل للتخصيص على Store حاليًا — نقطة مفتوحة للمراجعة لاحقًا.
    private const decimal VatRate = 0.15m;

    private async Task<Account> GetAccountByCodeAsync(long storeId, string code, string labelForError)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId && a.Code == code && a.IsActive);
        if (account == null)
            throw new InvalidOperationException($"لم يتم العثور على حساب '{labelForError}' (كود {code}) في شجرة حسابات المتجر");
        return account;
    }

    // ⚠️ قرار هندسي: كود حساب الإيرادات وحساب COGS غير مؤكَّدين بكود رقمي ثابت في المرجع الشامل
    // (خلافًا لبقية حسابات القالب المؤكدة بأكوادها 1101-1105/2101-2102)، لذلك يتم البحث بالنوع + كلمة مفتاحية.
    // الخطأ عند الفشل يوضح بالضبط الحساب الناقص — يحتاج تأكيد الأكواد الفعلية بعد أول اختبار حقيقي.
    private async Task<Account> GetAccountByTypeAndKeywordAsync(long storeId, AccountType type, string keyword, string labelForError)
    {
        var account = await _context.Accounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId && a.AccountType == type && a.IsActive && a.NameAr.Contains(keyword));
        if (account == null)
            throw new InvalidOperationException($"لم يتم العثور على حساب '{labelForError}' ضمن نوع {type} في شجرة حسابات المتجر — تأكد من وجود حساب اسمه يحتوي على '{keyword}'");
        return account;
    }

    private async Task<string> GenerateInvoiceNumberAsync(long storeId, InvoiceType type)
    {
        var prefix = type == InvoiceType.Sales ? "INV-S" : "INV-P";
        var count = await _context.Set<Invoice>().CountAsync(i => i.StoreId == storeId && i.InvoiceType == type);
        return $"{prefix}-{(count + 1):D6}";
    }

    public async Task<InvoiceDto> CreateSalesInvoiceAsync(long userId, CreateSalesInvoiceDto dto)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("يجب إضافة بند واحد على الأقل للفاتورة");

        if (!Enum.TryParse<InvoicePaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            throw new InvalidOperationException("طريقة الدفع غير صحيحة (Cash أو Credit فقط)");

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");


        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var invoiceItems = new List<InvoiceItem>();
            var inventoryTransactions = new List<InventoryTransaction>();
            decimal subTotal = 0m;
            decimal totalCogs = 0m;

            foreach (var item in dto.Items)
            {
                if (item.Quantity <= 0)
                    throw new InvalidOperationException("الكمية يجب أن تكون أكبر من صفر");

                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.StoreId == storeId)
                    ?? throw new InvalidOperationException($"المنتج رقم {item.ProductId} غير موجود في متجرك");

                if (item.VariantId.HasValue)
                {
                    var variantExists = await _context.ProductVariants
                        .AnyAsync(v => v.Id == item.VariantId.Value && v.ProductId == product.Id);
                    if (!variantExists)
                        throw new InvalidOperationException($"المتغير رقم {item.VariantId} لا ينتمي للمنتج {product.NameAr}");
                }
                                var stock = await _context.InventoryStocks
                    .Include(s => s.Warehouse)
                    .Where(s => s.Warehouse.StoreId == storeId
                             && s.ProductId == product.Id
                             && s.VariantId == item.VariantId
                             && s.QuantityAvailable >= item.Quantity)
                    .OrderByDescending(s => s.Warehouse.IsDefault)
                    .ThenByDescending(s => s.QuantityAvailable)
                    .FirstOrDefaultAsync();

                if (stock == null)
                    throw new InvalidOperationException($"الكمية المتاحة من '{product.NameAr}' غير كافية لإتمام عملية البيع");

                var lineTotal = item.UnitPrice * item.Quantity;
                subTotal += lineTotal;
                totalCogs += product.CostPrice * item.Quantity;

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = product.NameAr,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = lineTotal
                });

                stock.QuantityAvailable -= item.Quantity;

                inventoryTransactions.Add(new InventoryTransaction
                {
                    WarehouseId = stock.WarehouseId,
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    TransactionType = InventoryTransactionType.Sale,
                    Quantity = -item.Quantity, // ⚠️ قرار هندسي: سالبة لتمثيل خروج المخزون، بنفس منطق Damage/TransferOut
                    ReferenceType = "SalesInvoice",
                    CreatedByUserId = userId
                });
            }

            var taxAmount = store.IsVatRegistered ? Math.Round(subTotal * VatRate, 2) : 0m;
            var totalAmount = subTotal + taxAmount;

            var debitAccount = paymentMethod == InvoicePaymentMethod.Cash
                ? await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)")
                : await GetAccountByCodeAsync(storeId, "1103", "العملاء (ذمم مدينة)");

            var revenueAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Revenue, "مبيعات", "إيرادات المبيعات");
            var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");
            var cogsAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Expense, "تكلفة البضاعة", "تكلفة البضاعة المباعة");

            var lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = debitAccount.Id, Debit = totalAmount, Credit = 0, LineDescription = "إجمالي فاتورة البيع" },
                new JournalEntryLine { AccountId = revenueAccount.Id, Debit = 0, Credit = subTotal, LineDescription = "إيراد المبيعات" }
            };

            if (taxAmount > 0)
            {
                var vatSalesAccount = await GetAccountByCodeAsync(storeId, "2102", "ضريبة القيمة المضافة على المبيعات");
                lines.Add(new JournalEntryLine { AccountId = vatSalesAccount.Id, Debit = 0, Credit = taxAmount, LineDescription = "ضريبة القيمة المضافة على المبيعات" });
            }

            lines.Add(new JournalEntryLine { AccountId = cogsAccount.Id, Debit = totalCogs, Credit = 0, LineDescription = "تكلفة البضاعة المباعة" });
            lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0, Credit = totalCogs, LineDescription = "خصم المخزون المباع" });

            var entryNumber = await GenerateEntryNumberAsync(storeId);
            var journalEntry = new JournalEntry
            {
                StoreId = storeId,
                EntryNumber = entryNumber,
                EntryDate = dto.InvoiceDate,
                Description = "قيد تلقائي — فاتورة بيع",
                Status = JournalEntryStatus.PendingApproval,
                CreatedByUserId = userId,
                IsAutoGenerated = true,
                SourceType = JournalSourceType.SalesInvoice,
                Lines = lines
            };
            _context.Set<JournalEntry>().Add(journalEntry);
            await _context.SaveChangesAsync();

            var invoiceNumber = await GenerateInvoiceNumberAsync(storeId, InvoiceType.Sales);
            var invoice = new Invoice
            {
                StoreId = storeId,
                InvoiceType = InvoiceType.Sales,
                InvoiceNumber = invoiceNumber,
                InvoiceDate = dto.InvoiceDate,
                CustomerId = dto.CustomerId,
                PartyName = dto.GuestName,
                PaymentMethod = paymentMethod,
                SubTotal = subTotal,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                CostOfGoodsSold = totalCogs,
                CreatedByUserId = userId,
                JournalEntryId = journalEntry.Id,
                Items = invoiceItems
            };
            _context.Set<Invoice>().Add(invoice);
            await _context.SaveChangesAsync();

            foreach (var t in inventoryTransactions)
                t.ReferenceId = invoice.Id;
            _context.InventoryTransactions.AddRange(inventoryTransactions);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            // ⚠️ إضافة (ربط الإشعارات — تفعيل فعلي أول مرة في المشروع كله):
            // بنبعت للـ Owner بعد نجاح إنشاء فاتورة البيع فعليًا (خارج الـ Transaction، لا يوقف العملية لو فشل)
            try
            {
                var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
                if (ownerUserId != 0)
                {
                    await _notificationService.CreateAsync(
                        ownerUserId,
                        "فاتورة بيع جديدة",
                        $"تم إنشاء فاتورة بيع رقم {invoice.InvoiceNumber} بقيمة {invoice.TotalAmount} ر.س",
                        NotificationType.InvoiceCreated,
                        $"/dashboard/accounting/invoices/{invoice.Id}");
                }
            }
            catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء الفاتورة */ }

            return await GetInvoiceByIdAsync(userId, invoice.Id);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<InvoiceDto> CreatePurchaseInvoiceAsync(long userId, CreatePurchaseInvoiceDto dto)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("يجب إضافة بند واحد على الأقل للفاتورة");
        if (string.IsNullOrWhiteSpace(dto.SupplierName))
            throw new InvalidOperationException("يجب إدخال اسم المورد");
        if (dto.Items.Any(i => i.Quantity <= 0))
            throw new InvalidOperationException("الكمية يجب أن تكون أكبر من صفر");
        if (dto.Items.Any(i => i.UnitPrice < 0))
            throw new InvalidOperationException("سعر الشراء لا يمكن أن يكون سالبًا");

        if (!Enum.TryParse<InvoicePaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            throw new InvalidOperationException("طريقة الدفع غير صحيحة (Cash أو Credit فقط)");

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        // ⚠️ قرار هندسي: الشراء يُستقبَل حاليًا في المستودع الافتراضي فقط
        var warehouse = await _context.Warehouses.FirstOrDefaultAsync(w => w.StoreId == storeId && w.IsDefault)
            ?? throw new InvalidOperationException("لا يوجد مستودع افتراضي لهذا المتجر");

        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var invoiceItems = new List<InvoiceItem>();
            var inventoryTransactions = new List<InventoryTransaction>();
            decimal subTotal = 0m;

            foreach (var item in dto.Items)
            {
                var product = await _context.Products
                    .FirstOrDefaultAsync(p => p.Id == item.ProductId && p.StoreId == storeId)
                    ?? throw new InvalidOperationException($"المنتج رقم {item.ProductId} غير موجود في متجرك");

                if (item.VariantId.HasValue)
                {
                    var variantExists = await _context.ProductVariants
                        .AnyAsync(v => v.Id == item.VariantId.Value && v.ProductId == product.Id);
                    if (!variantExists)
                        throw new InvalidOperationException($"المتغير رقم {item.VariantId} لا ينتمي للمنتج {product.NameAr}");
                }

                var lineTotal = item.UnitPrice * item.Quantity;
                subTotal += lineTotal;

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = product.NameAr,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    LineTotal = lineTotal
                });

                // ⚠️ القرار الهندسي الأهم في هذا التاسك: تحديث تكلفة المنتج بالمتوسط المرجّح
                // عند كل عملية شراء. لا يوجد منطق مشابه في المشروع قبل هذا التاسك (تأكدت بمراجعة
                // ProductService.cs فعليًا) — هذا أول تطبيق له.
                var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
                    s.WarehouseId == warehouse.Id && s.ProductId == product.Id && s.VariantId == item.VariantId);

                var oldQty = stock?.QuantityAvailable ?? 0;
                var oldCost = product.CostPrice;
                var newQty = oldQty + item.Quantity;

                product.CostPrice = newQty > 0
                    ? Math.Round(((oldQty * oldCost) + (item.Quantity * item.UnitPrice)) / newQty, 2)
                    : item.UnitPrice;
                product.UpdatedAt = DateTime.UtcNow;

                if (stock == null)
                {
                    stock = new InventoryStock
                    {
                        WarehouseId = warehouse.Id,
                        ProductId = product.Id,
                        VariantId = item.VariantId,
                        QuantityAvailable = item.Quantity,
                        QuantityReserved = 0,
                        ReorderLevel = 0
                    };
                    _context.InventoryStocks.Add(stock);
                }
                else
                {
                    stock.QuantityAvailable += item.Quantity;
                }

                inventoryTransactions.Add(new InventoryTransaction
                {
                    WarehouseId = warehouse.Id,
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    TransactionType = InventoryTransactionType.Purchase,
                    Quantity = item.Quantity,
                    ReferenceType = "PurchaseInvoice",
                    CreatedByUserId = userId
                });
            }

            var taxAmount = store.IsVatRegistered ? Math.Round(subTotal * VatRate, 2) : 0m;
            var totalAmount = subTotal + taxAmount;

            var creditAccount = paymentMethod == InvoicePaymentMethod.Cash
                ? await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)")
                : await GetAccountByCodeAsync(storeId, "2101", "الموردون (ذمم دائنة)");

            var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");

            var lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = subTotal, Credit = 0, LineDescription = "إضافة مخزون بضاعة الشراء" }
            };

            if (taxAmount > 0)
            {
                var vatPurchaseAccount = await GetAccountByCodeAsync(storeId, "1105", "ضريبة القيمة المضافة على المشتريات");
                lines.Add(new JournalEntryLine { AccountId = vatPurchaseAccount.Id, Debit = taxAmount, Credit = 0, LineDescription = "ضريبة القيمة المضافة على المشتريات" });
            }

            lines.Add(new JournalEntryLine { AccountId = creditAccount.Id, Debit = 0, Credit = totalAmount, LineDescription = "إجمالي فاتورة الشراء" });

            var entryNumber = await GenerateEntryNumberAsync(storeId);
            var journalEntry = new JournalEntry
            {
                StoreId = storeId,
                EntryNumber = entryNumber,
                EntryDate = dto.InvoiceDate,
                Description = "قيد تلقائي — فاتورة شراء",
                Status = JournalEntryStatus.PendingApproval,
                CreatedByUserId = userId,
                IsAutoGenerated = true,
                SourceType = JournalSourceType.PurchaseInvoice,
                Lines = lines
            };
            _context.Set<JournalEntry>().Add(journalEntry);
            await _context.SaveChangesAsync();

            var invoiceNumber = await GenerateInvoiceNumberAsync(storeId, InvoiceType.Purchase);
            var invoice = new Invoice
            {
                StoreId = storeId,
                InvoiceType = InvoiceType.Purchase,
                InvoiceNumber = invoiceNumber,
                InvoiceDate = dto.InvoiceDate,
                CustomerId = null,
                PartyName = dto.SupplierName.Trim(),
                PaymentMethod = paymentMethod,
                SubTotal = subTotal,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                CostOfGoodsSold = null,
                CreatedByUserId = userId,
                JournalEntryId = journalEntry.Id,
                Items = invoiceItems
            };
            _context.Set<Invoice>().Add(invoice);
            await _context.SaveChangesAsync();

            foreach (var t in inventoryTransactions)
                t.ReferenceId = invoice.Id;
            _context.InventoryTransactions.AddRange(inventoryTransactions);
            await _context.SaveChangesAsync();

            await transaction.CommitAsync();

            // ⚠️ إضافة (ربط الإشعارات)
            try
            {
                var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
                if (ownerUserId != 0)
                {
                    await _notificationService.CreateAsync(
                        ownerUserId,
                        "فاتورة شراء جديدة",
                        $"تم إنشاء فاتورة شراء رقم {invoice.InvoiceNumber} بقيمة {invoice.TotalAmount} ر.س من المورد {invoice.PartyName}",
                        NotificationType.InvoiceCreated,
                        $"/dashboard/accounting/invoices/{invoice.Id}");
                }
            }
            catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء الفاتورة */ }

            return await GetInvoiceByIdAsync(userId, invoice.Id);
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<List<InvoiceDto>> GetInvoicesAsync(long userId, string? invoiceType, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var query = _context.Set<Invoice>()
            .Include(i => i.Items)
            .Include(i => i.JournalEntry)
            .Where(i => i.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(invoiceType) && Enum.TryParse<InvoiceType>(invoiceType, true, out var typeEnum))
            query = query.Where(i => i.InvoiceType == typeEnum);

        if (from.HasValue)
            query = query.Where(i => i.InvoiceDate >= from.Value);
        if (to.HasValue)
            query = query.Where(i => i.InvoiceDate <= to.Value);

        var invoices = await query.OrderByDescending(i => i.InvoiceDate).ThenByDescending(i => i.Id).ToListAsync();
        return invoices.Select(MapInvoiceToDto).ToList();
    }

    public async Task<InvoiceDto> GetInvoiceByIdAsync(long userId, long invoiceId)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var invoice = await _context.Set<Invoice>()
            .Include(i => i.Items)
            .Include(i => i.JournalEntry)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.StoreId == storeId);

        if (invoice == null)
            throw new InvalidOperationException("الفاتورة غير موجودة");

        return MapInvoiceToDto(invoice);
    }

    private static InvoiceDto MapInvoiceToDto(Invoice inv) => new InvoiceDto
    {
        Id = inv.Id,
        InvoiceType = inv.InvoiceType.ToString(),
        InvoiceNumber = inv.InvoiceNumber,
        InvoiceDate = inv.InvoiceDate,
        CustomerId = inv.CustomerId,
        PartyName = inv.PartyName,
        PaymentMethod = inv.PaymentMethod.ToString(),
        SubTotal = inv.SubTotal,
        TaxAmount = inv.TaxAmount,
        TotalAmount = inv.TotalAmount,
        CostOfGoodsSold = inv.CostOfGoodsSold,
        JournalEntryId = inv.JournalEntryId,
        JournalEntryNumber = inv.JournalEntry?.EntryNumber,
        Items = inv.Items.Select(i => new InvoiceItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            VariantId = i.VariantId,
            ProductNameSnapshot = i.ProductNameSnapshot,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            LineTotal = i.LineTotal
        }).ToList()
    };
    // =====================================================================
    // تاسك 9: نقاط البيع POS / الكاشير
    // =====================================================================

    // ⚠️ قرار هندسي: الكاشير لا يبني منطقًا محاسبيًا جديدًا خالص — يستدعي CreateSalesInvoiceAsync
    // الموجودة والمختبرة فعليًا في تاسك 7 بنفسها (نفس القيد التلقائي، نفس خصم المخزون، نفس COGS)،
    // فقط بواجهة أبسط (بدون CustomerId رقمي). دفع نقدي فقط حاليًا — البطاقة/الدفع الإلكتروني
    // مؤجل لحين تأكيد كود حساب بنكي مخصص لها في شجرة الحسابات (غير مؤكَّد حاليًا).
    public async Task<InvoiceDto> CreatePosSaleAsync(long userId, CreatePosSaleDto dto)
    {
        if (dto.Items == null || dto.Items.Count == 0)
            throw new InvalidOperationException("يجب إضافة منتج واحد على الأقل لعملية البيع");

        var salesDto = new CreateSalesInvoiceDto
        {
            InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CustomerId = null,
            GuestName = string.IsNullOrWhiteSpace(dto.GuestName) ? "عميل نقدي" : dto.GuestName.Trim(),
            PaymentMethod = "Cash",
            Items = dto.Items
        };

        return await CreateSalesInvoiceAsync(userId, salesDto);
    }
  
    private async Task<string> GenerateVoucherNumberAsync(long storeId, VoucherType type)
    {
        var prefix = type == VoucherType.Receipt ? "RV" : "PV";
        var count = await _context.Set<Voucher>().CountAsync(v => v.StoreId == storeId && v.VoucherType == type);
        return $"{prefix}-{(count + 1):D6}";
    }

    private async Task<Account> GetCashOrBankAccountAsync(long storeId, VoucherPaymentMethod method)
    {
        return method == VoucherPaymentMethod.Cash
            ? await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)")
            : await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Asset, "بنك", "البنك");
    }

    private async Task<VoucherDto> CreateVoucherInternalAsync(long userId, CreateVoucherDto dto, VoucherType voucherType)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        if (dto.Amount <= 0)
            throw new InvalidOperationException("قيمة السند يجب أن تكون أكبر من صفر");

        if (!Enum.TryParse<VoucherPaymentMethod>(dto.PaymentMethod, true, out var paymentMethod))
            throw new InvalidOperationException("طريقة الدفع غير صحيحة (Cash أو Bank فقط)");

        var counterpartAccount = await _context.Accounts
            .FirstOrDefaultAsync(a => a.Id == dto.CounterpartAccountId && a.StoreId == storeId && a.IsActive)
            ?? throw new InvalidOperationException("الحساب المقابل غير موجود أو غير نشط");

        var cashOrBankAccount = await GetCashOrBankAccountAsync(storeId, paymentMethod);

        var lines = voucherType == VoucherType.Receipt
            ? new List<JournalEntryLine>
              {
                  new JournalEntryLine { AccountId = cashOrBankAccount.Id, Debit = dto.Amount, Credit = 0, LineDescription = "سند قبض" },
                  new JournalEntryLine { AccountId = counterpartAccount.Id, Debit = 0, Credit = dto.Amount, LineDescription = dto.Description ?? "سند قبض" }
              }
            : new List<JournalEntryLine>
              {
                  new JournalEntryLine { AccountId = counterpartAccount.Id, Debit = dto.Amount, Credit = 0, LineDescription = dto.Description ?? "سند صرف" },
                  new JournalEntryLine { AccountId = cashOrBankAccount.Id, Debit = 0, Credit = dto.Amount, LineDescription = "سند صرف" }
              };

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = dto.VoucherDate,
            Description = voucherType == VoucherType.Receipt ? "قيد تلقائي — سند قبض" : "قيد تلقائي — سند صرف",
            Status = JournalEntryStatus.PendingApproval,
            CreatedByUserId = userId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Voucher,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();

        var voucherNumber = await GenerateVoucherNumberAsync(storeId, voucherType);
        var voucher = new Voucher
        {
            StoreId = storeId,
            VoucherType = voucherType,
            VoucherNumber = voucherNumber,
            VoucherDate = dto.VoucherDate,
            Amount = dto.Amount,
            PaymentMethod = paymentMethod,
            CounterpartAccountId = counterpartAccount.Id,
            PartyName = dto.PartyName,
            CustomerId = dto.CustomerId,
            Description = dto.Description,
            CreatedByUserId = userId,
            JournalEntryId = journalEntry.Id
        };
        _context.Set<Voucher>().Add(voucher);
        await _context.SaveChangesAsync();

        // ⚠️ إضافة (ربط الإشعارات)
        try
        {
            var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
            if (ownerUserId != 0)
            {
                var titleAr = voucherType == VoucherType.Receipt ? "سند قبض جديد" : "سند صرف جديد";
                await _notificationService.CreateAsync(
                    ownerUserId,
                    titleAr,
                    $"تم إنشاء سند رقم {voucher.VoucherNumber} بقيمة {voucher.Amount} ر.س",
                    NotificationType.VoucherCreated,
                    $"/dashboard/accounting/vouchers/{voucher.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء السند */ }

        return await GetVoucherByIdInternalAsync(userId, voucher.Id);
    }

    public Task<VoucherDto> CreateReceiptVoucherAsync(long userId, CreateVoucherDto dto) =>
        CreateVoucherInternalAsync(userId, dto, VoucherType.Receipt);

    public Task<VoucherDto> CreatePaymentVoucherAsync(long userId, CreateVoucherDto dto) =>
        CreateVoucherInternalAsync(userId, dto, VoucherType.Payment);

    public async Task<List<VoucherDto>> GetVouchersAsync(long userId, string? voucherType, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var query = _context.Set<Voucher>()
            .Include(v => v.CounterpartAccount)
            .Include(v => v.JournalEntry)
            .Where(v => v.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(voucherType) && Enum.TryParse<VoucherType>(voucherType, true, out var typeEnum))
            query = query.Where(v => v.VoucherType == typeEnum);

        if (from.HasValue)
            query = query.Where(v => v.VoucherDate >= from.Value);
        if (to.HasValue)
            query = query.Where(v => v.VoucherDate <= to.Value);

        var vouchers = await query.OrderByDescending(v => v.VoucherDate).ThenByDescending(v => v.Id).ToListAsync();
        return vouchers.Select(MapVoucherToDto).ToList();
    }

    private async Task<VoucherDto> GetVoucherByIdInternalAsync(long userId, long voucherId)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var voucher = await _context.Set<Voucher>()
            .Include(v => v.CounterpartAccount)
            .Include(v => v.JournalEntry)
            .FirstOrDefaultAsync(v => v.Id == voucherId && v.StoreId == storeId)
            ?? throw new InvalidOperationException("السند غير موجود");

        return MapVoucherToDto(voucher);
    }

    private static VoucherDto MapVoucherToDto(Voucher v) => new VoucherDto
    {
        Id = v.Id,
        VoucherType = v.VoucherType.ToString(),
        VoucherNumber = v.VoucherNumber,
        VoucherDate = v.VoucherDate,
        Amount = v.Amount,
        PaymentMethod = v.PaymentMethod.ToString(),
        CounterpartAccountId = v.CounterpartAccountId,
        CounterpartAccountNameAr = v.CounterpartAccount?.NameAr ?? "",
        PartyName = v.PartyName,
        CustomerId = v.CustomerId,
        Description = v.Description,
        JournalEntryId = v.JournalEntryId,
        JournalEntryNumber = v.JournalEntry?.EntryNumber
    };
 public async Task<JournalEntryDto> CreatePayrollJournalEntryAsync(long storeId, long createdByUserId, string employeeName, decimal netSalary, DateOnly periodMonth)
    {
        if (netSalary <= 0)
            throw new InvalidOperationException("لا يمكن توليد قيد محاسبي لراتب بقيمة صفرية أو سالبة");
 
        // ⚠️ نفس نمط تاسك 13 (مصروف الإهلاك): كود حساب "مصروف الرواتب" غير مؤكَّد كرقم ثابت
        // في القالب الافتراضي، فيتم البحث بالنوع (Expense) + كلمة مفتاحية "رواتب". لو الحساب
        // مش موجود، الخطأ هيوضح كده بالظبط — احتمال حقيقي إنه يحتاج إضافة يدوية زي "مصروف
        // الإهلاك" (راجع نقطة مفتوحة 9.2 في المرجع الشامل)، يُتأكَّد منه أول اختبار فعلي.
        var salaryExpenseAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Expense, "رواتب", "مصروف الرواتب");
        // حساب "رواتب مستحقة الدفع" مؤكَّد بكود ثابت 2103 من القالب الافتراضي (تاسك 1) — أُنشئ خصيصًا لهذا التاسك
        var salariesPayableAccount = await GetAccountByCodeAsync(storeId, "2103", "رواتب مستحقة الدفع");
 
        var lines = new List<JournalEntryLine>
        {
            new JournalEntryLine { AccountId = salaryExpenseAccount.Id, Debit = netSalary, Credit = 0, LineDescription = $"مصروف راتب — {employeeName}" },
            new JournalEntryLine { AccountId = salariesPayableAccount.Id, Debit = 0, Credit = netSalary, LineDescription = $"راتب مستحق الدفع — {employeeName}" }
        };
 
        var entryNumber = await GenerateEntryNumberAsync(storeId);
        // ⚠️ قرار: تاريخ اعتماد الراتب الفعلي (اليوم)، نفس نمط تاسك 13 (RunDepreciationAsync
        // بيستخدم تاريخ التشغيل الفعلي، مش تاريخ الفترة PeriodMonth) — للاتساق في المشروع.
        var entryDate = DateOnly.FromDateTime(DateTime.UtcNow);
 
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = entryDate,
            Description = $"قيد تلقائي — راتب {employeeName} لفترة {periodMonth:yyyy-MM}",
            // ⚠️ القرار الهندسي رقم 1 (المُلزم): قيود الرواتب PendingApproval (بخلاف الإهلاك) —
            // تحتاج اعتماد Owner منفصل (راجع الفجوة المكتشفة الخاصة بفصل المهام في رسالة التسليم).
            Status = JournalEntryStatus.PendingApproval,
            CreatedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Payroll,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
 
        // ⚠️ إضافة (ربط الإشعارات) — إشعار الـ Owner بقيد راتب جديد محتاج اعتماده
        try
        {
            var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
            if (ownerUserId != 0 && ownerUserId != createdByUserId)
            {
                await _notificationService.CreateAsync(
                    ownerUserId,
                    "قيد راتب جديد بانتظار الاعتماد",
                    $"تم إنشاء قيد راتب {employeeName} بقيمة {netSalary} ر.س لفترة {periodMonth:yyyy-MM}، بانتظار اعتمادك",
                    NotificationType.PayrollJournalEntryCreated,
                    $"/dashboard/accounting/journal-entries/{journalEntry.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء قيد الراتب */ }
 
        return await GetJournalEntryByIdAsync(createdByUserId, journalEntry.Id);
    }
// =====================================================================
    // تاسك 13: الأصول الثابتة + الإهلاك التلقائي (Auto-Approved)
    // =====================================================================

    public async Task<FixedAssetDto> CreateFixedAssetAsync(long userId, CreateFixedAssetDto dto)
    {
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

        // ⚠️ قرار هندسي: تسجيل الأصول الثابتة مقصور على Owner فقط (نفس منطق CRUD شجرة الحسابات) —
        // قرار إداري حساس، لم يُنصّ عليه صراحة في نص التاسك.
        if (role != "Owner")
            throw new InvalidOperationException("تسجيل الأصول الثابتة مسموح فقط لصاحب المتجر (Owner)");

        if (string.IsNullOrWhiteSpace(dto.NameAr))
            throw new InvalidOperationException("يجب إدخال اسم الأصل");
        if (dto.PurchaseCost <= 0)
            throw new InvalidOperationException("تكلفة الشراء يجب أن تكون أكبر من صفر");
        if (dto.UsefulLifeYears <= 0)
            throw new InvalidOperationException("العمر الإنتاجي يجب أن يكون سنة واحدة على الأقل");

        var asset = new FixedAsset
        {
            StoreId = storeId,
            NameAr = dto.NameAr.Trim(),
            PurchaseCost = dto.PurchaseCost,
            PurchaseDate = dto.PurchaseDate,
            UsefulLifeYears = dto.UsefulLifeYears,
            DepreciationMethod = DepreciationMethod.StraightLine,
            AccumulatedDepreciation = 0m,
            IsFullyDepreciated = false,
            IsActive = true,
            CreatedByUserId = userId
        };

        _context.Set<FixedAsset>().Add(asset);
        await _context.SaveChangesAsync();

        return MapFixedAssetToDto(asset);
    }

    public async Task<List<FixedAssetDto>> GetFixedAssetsAsync(long userId)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var assets = await _context.Set<FixedAsset>()
            .Where(a => a.StoreId == storeId)
            .OrderByDescending(a => a.PurchaseDate)
            .ToListAsync();

        return assets.Select(MapFixedAssetToDto).ToList();
    }

    private static decimal CalculateMonthlyDepreciation(FixedAsset asset) =>
        Math.Round(asset.PurchaseCost / (asset.UsefulLifeYears * 12m), 2);

    private static FixedAssetDto MapFixedAssetToDto(FixedAsset a) => new FixedAssetDto
    {
        Id = a.Id,
        NameAr = a.NameAr,
        PurchaseCost = a.PurchaseCost,
        PurchaseDate = a.PurchaseDate,
        UsefulLifeYears = a.UsefulLifeYears,
        DepreciationMethod = a.DepreciationMethod.ToString(),
        AccumulatedDepreciation = a.AccumulatedDepreciation,
        CurrentBookValue = a.PurchaseCost - a.AccumulatedDepreciation,
        IsFullyDepreciated = a.IsFullyDepreciated,
        IsActive = a.IsActive,
        MonthlyDepreciationAmount = CalculateMonthlyDepreciation(a)
    };

    public async Task<List<DepreciationRunResultDto>> RunDepreciationAsync(long userId, RunDepreciationDto dto)
    {
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

        // ⚠️ قرار هندسي: نفس منطق تسجيل الأصل — تشغيل الإهلاك مقصور على Owner فقط
        if (role != "Owner")
            throw new InvalidOperationException("تشغيل الإهلاك مسموح فقط لصاحب المتجر (Owner)");

        var periodMonth = DateTime.UtcNow.ToString("yyyy-MM");
        var depreciationDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var query = _context.Set<FixedAsset>()
            .Where(a => a.StoreId == storeId && a.IsActive && !a.IsFullyDepreciated);

        if (dto.FixedAssetId.HasValue)
            query = query.Where(a => a.Id == dto.FixedAssetId.Value);

        var assets = await query.ToListAsync();

        if (dto.FixedAssetId.HasValue && assets.Count == 0)
            throw new InvalidOperationException("الأصل الثابت غير موجود، أو غير نشط، أو مُستهلَك بالكامل بالفعل");

        var results = new List<DepreciationRunResultDto>();

        foreach (var asset in assets)
        {
            var alreadyRun = await _context.Set<DepreciationEntry>()
                .AnyAsync(d => d.FixedAssetId == asset.Id && d.PeriodMonth == periodMonth);
            if (alreadyRun)
                continue; // تخطي الأصل بصمت لو الإهلاك اتشغل له بالفعل هذا الشهر (في التشغيل الجماعي)

            var remaining = asset.PurchaseCost - asset.AccumulatedDepreciation;
            if (remaining <= 0)
            {
                asset.IsFullyDepreciated = true;
                continue;
            }

            var monthlyAmount = CalculateMonthlyDepreciation(asset);
            var amount = Math.Min(monthlyAmount, remaining);

            var depreciationExpenseAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Expense, "إهلاك", "مصروف الإهلاك");
            var accumulatedDepreciationAccount = await GetAccountByCodeAsync(storeId, "1202", "مجمّع إهلاك الأصول الثابتة");

            var lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = depreciationExpenseAccount.Id, Debit = amount, Credit = 0, LineDescription = $"مصروف إهلاك — {asset.NameAr}" },
                new JournalEntryLine { AccountId = accumulatedDepreciationAccount.Id, Debit = 0, Credit = amount, LineDescription = $"مجمّع إهلاك — {asset.NameAr}" }
            };

            var entryNumber = await GenerateEntryNumberAsync(storeId);
            var journalEntry = new JournalEntry
            {
                StoreId = storeId,
                EntryNumber = entryNumber,
                EntryDate = depreciationDate,
                Description = $"قيد تلقائي — إهلاك أصل ثابت ({asset.NameAr}) لفترة {periodMonth}",
                // ⚠️ القرار الهندسي رقم 2 (المُلزم): قيود الإهلاك Auto-Approved مباشرة، وليست PendingApproval
                Status = JournalEntryStatus.Approved,
                CreatedByUserId = userId,
                ApprovedByUserId = userId,
                IsAutoGenerated = true,
                SourceType = JournalSourceType.Depreciation,
                Lines = lines
            };
            _context.Set<JournalEntry>().Add(journalEntry);
            await _context.SaveChangesAsync();

            asset.AccumulatedDepreciation += amount;
            var newBookValue = asset.PurchaseCost - asset.AccumulatedDepreciation;
            if (newBookValue <= 0)
                asset.IsFullyDepreciated = true;
            asset.UpdatedAt = DateTime.UtcNow;

            var depreciationEntry = new DepreciationEntry
            {
                FixedAssetId = asset.Id,
                PeriodMonth = periodMonth,
                DepreciationDate = depreciationDate,
                Amount = amount,
                JournalEntryId = journalEntry.Id,
                CreatedByUserId = userId
            };
            _context.Set<DepreciationEntry>().Add(depreciationEntry);
            await _context.SaveChangesAsync();

            results.Add(new DepreciationRunResultDto
            {
                FixedAssetId = asset.Id,
                FixedAssetNameAr = asset.NameAr,
                DepreciationAmount = amount,
                NewAccumulatedDepreciation = asset.AccumulatedDepreciation,
                NewBookValue = newBookValue,
                IsNowFullyDepreciated = asset.IsFullyDepreciated,
                JournalEntryId = journalEntry.Id,
                JournalEntryNumber = journalEntry.EntryNumber,
                PeriodMonth = periodMonth
            });
        }

        // حفظ أي تعديل متبقٍ لم يُحفظ داخل الحلقة (مثل تعليم أصل كمُستهلَك بالكامل بدون قيد جديد)
        await _context.SaveChangesAsync();

        if (results.Count == 0 && dto.FixedAssetId.HasValue)
            throw new InvalidOperationException("تم تشغيل الإهلاك لهذا الأصل بالفعل في هذه الفترة، أو أنه مُستهلَك بالكامل");

        if (results.Count == 0 && !dto.FixedAssetId.HasValue)
            throw new InvalidOperationException("لا توجد أصول تحتاج إهلاكًا هذه الفترة (كل الأصول إما مُستهلَكة بالكامل أو تم تشغيل إهلاكها بالفعل هذا الشهر)");

        // ⚠️ إضافة (ربط الإشعارات): إشعار واحد ملخّص بعد نجاح تشغيل الإهلاك، بدل إشعار لكل أصل على حدة
        try
        {
            var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
            if (ownerUserId != 0 && results.Count > 0)
            {
                var totalAmount = results.Sum(r => r.DepreciationAmount);
                await _notificationService.CreateAsync(
                    ownerUserId,
                    "تم تشغيل الإهلاك الدوري",
                    $"تم تشغيل إهلاك {results.Count} أصل/أصول بإجمالي {totalAmount} ر.س لفترة {periodMonth}",
                    NotificationType.FixedAssetDepreciationPosted,
                    "/dashboard/accounting/fixed-assets");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح تشغيل الإهلاك */ }

        return results;
    }

    // =====================================================================
    // تاسك 17: التقارير المالية الأربعة — مبنية على القيود المعتمدة فقط (Status == Approved)
    // =====================================================================

    private static bool IsDebitNormalType(AccountType type) =>
        type == AccountType.Asset || type == AccountType.Expense;

    public async Task<TrialBalanceDto> GetTrialBalanceAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var accounts = await _context.Accounts
            .Where(a => a.StoreId == storeId)
            .OrderBy(a => a.Code)
            .ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();

        var query = _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && accountIds.Contains(l.AccountId));

        if (from.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate <= to.Value);

        var lines = await query.ToListAsync();

        var result = new List<TrialBalanceLineDto>();
        decimal totalDebit = 0m, totalCredit = 0m;

        foreach (var account in accounts)
        {
            var accountLines = lines.Where(l => l.AccountId == account.Id).ToList();
            if (accountLines.Count == 0)
                continue;

            var debitSum = accountLines.Sum(l => l.Debit);
            var creditSum = accountLines.Sum(l => l.Credit);
            var isDebitNormal = IsDebitNormalType(account.AccountType);
            var net = isDebitNormal ? debitSum - creditSum : creditSum - debitSum;

            decimal debitBalance = 0m, creditBalance = 0m;
            if (net >= 0)
            {
                if (isDebitNormal) debitBalance = net; else creditBalance = net;
            }
            else
            {
                if (isDebitNormal) creditBalance = -net; else debitBalance = -net;
            }

            if (debitBalance == 0 && creditBalance == 0)
                continue;

            totalDebit += debitBalance;
            totalCredit += creditBalance;

            result.Add(new TrialBalanceLineDto
            {
                AccountId = account.Id,
                AccountCode = account.Code,
                AccountNameAr = account.NameAr,
                AccountType = account.AccountType.ToString(),
                DebitBalance = debitBalance,
                CreditBalance = creditBalance
            });
        }

        return new TrialBalanceDto
        {
            From = from,
            To = to,
            Lines = result,
            TotalDebit = totalDebit,
            TotalCredit = totalCredit,
            IsBalanced = Math.Abs(totalDebit - totalCredit) < 0.01m
        };
    }

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var accounts = await _context.Accounts
            .Where(a => a.StoreId == storeId && (a.AccountType == AccountType.Revenue || a.AccountType == AccountType.Expense))
            .OrderBy(a => a.Code)
            .ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();

        var query = _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && accountIds.Contains(l.AccountId));

        if (from.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate >= from.Value);
        if (to.HasValue)
            query = query.Where(l => l.JournalEntry.EntryDate <= to.Value);

        var lines = await query.ToListAsync();

        var revenueLines = new List<IncomeStatementLineDto>();
        var expenseLines = new List<IncomeStatementLineDto>();
        decimal totalRevenue = 0m, totalExpenses = 0m;

        foreach (var account in accounts)
        {
            var accLines = lines.Where(l => l.AccountId == account.Id).ToList();
            if (accLines.Count == 0)
                continue;

            if (account.AccountType == AccountType.Revenue)
            {
                var amount = accLines.Sum(l => l.Credit - l.Debit);
                if (amount == 0) continue;
                totalRevenue += amount;
                revenueLines.Add(new IncomeStatementLineDto { AccountId = account.Id, AccountCode = account.Code, AccountNameAr = account.NameAr, Amount = amount });
            }
            else
            {
                var amount = accLines.Sum(l => l.Debit - l.Credit);
                if (amount == 0) continue;
                totalExpenses += amount;
                expenseLines.Add(new IncomeStatementLineDto { AccountId = account.Id, AccountCode = account.Code, AccountNameAr = account.NameAr, Amount = amount });
            }
        }

        return new IncomeStatementDto
        {
            From = from,
            To = to,
            RevenueLines = revenueLines,
            ExpenseLines = expenseLines,
            TotalRevenue = totalRevenue,
            TotalExpenses = totalExpenses,
            NetProfit = totalRevenue - totalExpenses
        };
    }

    public async Task<BalanceSheetDto> GetBalanceSheetAsync(long userId, DateOnly asOf)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var accounts = await _context.Accounts
            .Where(a => a.StoreId == storeId)
            .OrderBy(a => a.Code)
            .ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();

        var lines = await _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && l.JournalEntry.EntryDate <= asOf
                     && accountIds.Contains(l.AccountId))
            .ToListAsync();

        var assetLines = new List<BalanceSheetLineDto>();
        var liabilityLines = new List<BalanceSheetLineDto>();
        var equityLines = new List<BalanceSheetLineDto>();
        decimal totalAssets = 0m, totalLiabilities = 0m, totalEquity = 0m;
        decimal totalRevenue = 0m, totalExpenses = 0m;

        foreach (var account in accounts)
        {
            var accLines = lines.Where(l => l.AccountId == account.Id).ToList();
            if (accLines.Count == 0)
                continue;

            switch (account.AccountType)
            {
                case AccountType.Asset:
                    var assetBalance = accLines.Sum(l => l.Debit - l.Credit);
                    if (assetBalance == 0) continue;
                    totalAssets += assetBalance;
                    assetLines.Add(new BalanceSheetLineDto { AccountId = account.Id, AccountCode = account.Code, AccountNameAr = account.NameAr, Amount = assetBalance });
                    break;
                case AccountType.Liability:
                    var liabilityBalance = accLines.Sum(l => l.Credit - l.Debit);
                    if (liabilityBalance == 0) continue;
                    totalLiabilities += liabilityBalance;
                    liabilityLines.Add(new BalanceSheetLineDto { AccountId = account.Id, AccountCode = account.Code, AccountNameAr = account.NameAr, Amount = liabilityBalance });
                    break;
                case AccountType.Equity:
                    var equityBalance = accLines.Sum(l => l.Credit - l.Debit);
                    if (equityBalance == 0) continue;
                    totalEquity += equityBalance;
                    equityLines.Add(new BalanceSheetLineDto { AccountId = account.Id, AccountCode = account.Code, AccountNameAr = account.NameAr, Amount = equityBalance });
                    break;
                case AccountType.Revenue:
                    totalRevenue += accLines.Sum(l => l.Credit - l.Debit);
                    break;
                case AccountType.Expense:
                    totalExpenses += accLines.Sum(l => l.Debit - l.Credit);
                    break;
            }
        }

        // ⚠️ قرار هندسي (تاسك 17، لم يُحسم صراحة في ملف التاسكات): لا يوجد قيد إقفال دوري
        // للإيرادات/المصروفات في المشروع حتى الآن، فبدون إضافة صافي الربح لحقوق الملكية هنا
        // لن تتوازن الميزانية (Assets = Liabilities + Equity) رياضيًا. يُضاف كسطر منفصل واضح
        // بدل دمجه داخل رصيد حساب حقيقي، ويحتاج مراجعة لاحقة (هل يُستبدل بقيد إقفال فعلي مستقبلاً؟).
        var netProfit = totalRevenue - totalExpenses;
        if (netProfit != 0)
        {
            equityLines.Add(new BalanceSheetLineDto
            {
                AccountId = 0,
                AccountCode = "-",
                AccountNameAr = "صافي الربح/الخسارة المرحّل (غير مقفل بقيد رسمي)",
                Amount = netProfit
            });
            totalEquity += netProfit;
        }

        return new BalanceSheetDto
        {
            AsOf = asOf,
            AssetLines = assetLines,
            LiabilityLines = liabilityLines,
            EquityLines = equityLines,
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            TotalEquity = totalEquity,
            IsBalanced = Math.Abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01m
        };
    }

    public async Task<CashFlowDto> GetCashFlowAsync(long userId, DateOnly? from, DateOnly? to)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        // ⚠️ قرار هندسي (تاسك 17، لم يُحسم صراحة في ملف التاسكات): لا يوجد تصنيف
        // تشغيلي/استثماري/تمويلي في نموذج البيانات الحالي (JournalSourceType لا يحمل هذا
        // التبويب)، فالتدفق النقدي هنا مبسّط بنفس روح "بدون نظام تحليلات معقد" المتبع في
        // تاسك 8: صافي حركة حسابات النقدية/البنك خلال الفترة، مجمّعة حسب مصدر العملية
        // (SourceType) بدل التصنيف المحاسبي الكامل. يحتاج قرارًا صريحًا لاحقًا لو المطلوب
        // تصنيف رسمي (تشغيلي/استثماري/تمويلي).
        var cashAccounts = await _context.Accounts
            .Where(a => a.StoreId == storeId && a.AccountType == AccountType.Asset &&
                   (a.Code == "1101" || a.Code == "1102" || a.NameAr.Contains("بنك") || a.NameAr.Contains("الصندوق") || a.NameAr.Contains("النقدية")))
            .ToListAsync();

        var cashAccountIds = cashAccounts.Select(a => a.Id).ToList();
        if (cashAccountIds.Count == 0)
            throw new InvalidOperationException("لا يوجد حساب نقدية أو بنك في شجرة حسابات المتجر");

        var allLines = await _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && cashAccountIds.Contains(l.AccountId))
            .ToListAsync();

        var openingBalance = from.HasValue
            ? allLines.Where(l => l.JournalEntry.EntryDate < from.Value).Sum(l => l.Debit - l.Credit)
            : 0m;

        var periodLines = allLines.Where(l =>
            (!from.HasValue || l.JournalEntry.EntryDate >= from.Value) &&
            (!to.HasValue || l.JournalEntry.EntryDate <= to.Value)).ToList();

        var movementsBySource = periodLines
            .GroupBy(l => l.JournalEntry.SourceType?.ToString() ?? "Manual")
            .Select(g => new CashFlowLineDto
            {
                SourceType = g.Key,
                NetAmount = g.Sum(l => l.Debit - l.Credit)
            })
            .OrderByDescending(g => Math.Abs(g.NetAmount))
            .ToList();

        var netChange = periodLines.Sum(l => l.Debit - l.Credit);
        var closingBalance = openingBalance + netChange;

        return new CashFlowDto
        {
            From = from,
            To = to,
            OpeningCashBalance = openingBalance,
            ClosingCashBalance = closingBalance,
            NetChangeInCash = netChange,
            MovementsBySource = movementsBySource
        };
    }
}