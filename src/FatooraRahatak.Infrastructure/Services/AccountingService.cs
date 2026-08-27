using Microsoft.EntityFrameworkCore;
using FatooraRahatak.Application.DTOs;
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

        if (!string.IsNullOrWhiteSpace(dto.Code) && dto.Code.Trim() != account.Code)
        {
            var codeExists = await _context.Accounts
                .AnyAsync(a => a.StoreId == store.Id && a.Code == dto.Code.Trim() && a.Id != accountId);
            if (codeExists)
                throw new InvalidOperationException("رقم الحساب مستخدم بالفعل، اختر رقمًا آخر");
            account.Code = dto.Code.Trim();
        }

        if (dto.ParentAccountId.HasValue)
        {
            if (dto.ParentAccountId.Value == accountId)
                throw new InvalidOperationException("لا يمكن جعل الحساب أبًا لنفسه");

            var parentExists = await _context.Accounts
                .AnyAsync(a => a.Id == dto.ParentAccountId.Value && a.StoreId == store.Id);
            if (!parentExists)
                throw new InvalidOperationException("الحساب الأب غير موجود");

            var isChild = await _context.Accounts
                .AnyAsync(a => a.ParentAccountId == accountId && a.Id == dto.ParentAccountId.Value);
            if (isChild)
                throw new InvalidOperationException("لا يمكن جعل حساب فرعي أبًا للحساب الأصل");
        }
        account.ParentAccountId = dto.ParentAccountId;

        account.NameAr = dto.NameAr.Trim();
        if (dto.AccountType.HasValue)
            account.AccountType = dto.AccountType.Value;
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
        var (storeId, role, _) = await ResolveStoreAndRoleAsync(userId);

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

        // ⚠️ إصلاح "تفعيل الترحيل التلقائي للقيود لدفتر الأستاذ": القيود التي يُنشئها صاحب المتجر
        // (السلطة الأعلى) تُعتمد وتُرحَّل فورًا لدفتر الأستاذ، بينما قيود الموظفين تبقى
        // PendingApproval بانتظار اعتماد الـ Owner (فصل مهام محفوظ كتصميم).
        var isOwner = role == "Owner";

        var entry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = dto.EntryDate,
            Description = dto.Description,
            Status = isOwner ? JournalEntryStatus.Approved : JournalEntryStatus.PendingApproval,
            CreatedByUserId = userId,
            ApprovedByUserId = isOwner ? userId : null,
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
        // (يُرسل فقط لقيود الموظفين؛ قيود الـ Owner تُرحَّل فورًا دون انتظار)
        try
        {
            if (!isOwner)
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

        // ⚠️ إصلاح: صاحب المتجر (المسؤول) هو السلطة الأعلى، فيحق له اعتماد قيد كتبه بنفسه.
        // قاعدة فصل المهام تنطبق على الموظفين فقط (لو مُنحوا صلاحية الاعتماد عبر PermissionOverrides).
        if (entry.CreatedByUserId == userId && role != "Owner")
            throw new InvalidOperationException("لا يمكنك اعتماد قيد أدخلته بنفسك (فصل المهام) — صاحب المتجر (المسؤول) فقط هو من يعتمد القيود");

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

        // ⚠️ إصلاح: صاحب المتجر (المسؤول) هو السلطة الأعلى، فيحق له رفض قيد كتبه بنفسه.
        // قاعدة فصل المهام تنطبق على الموظفين فقط (لو مُنحوا صلاحية الاعتماد عبر PermissionOverrides).
        if (entry.CreatedByUserId == userId && role != "Owner")
            throw new InvalidOperationException("لا يمكنك رفض قيد أدخلته بنفسك (فصل المهام) — صاحب المتجر (المسؤول) فقط هو من يرفض القيود");

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
        // ⚠️ إصلاح: الترقيم بالاعتماد على أكبر رقم تسلسلي موجود + 1 (بدلًا من العدد) لتفادي
        // التكرار والقفز عند الحذف أو فشل عملية وسط الترنزاكشن — نفس إصلاح ترقيم الفواتير.
        var existing = await _context.Set<JournalEntry>()
            .Where(e => e.StoreId == storeId)
            .Select(e => e.EntryNumber)
            .ToListAsync();

        var maxSeq = existing
            .Select(n =>
            {
                var idx = n.LastIndexOf('-');
                return idx >= 0 && int.TryParse(n[(idx + 1)..], out var v) ? v : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"JE-{(maxSeq + 1):D6}";
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

    // ⚠️ إضافة (فرق الوردية): يجيب حسابًا بالكود، أو ينشئه تلقائيًا لو غير موجود
    // (للمتاجر القديمة اللي اتأنشأت قبل إضافة الحسابات الجديدة لشجرة الحسابات).
    private async Task<Account> GetOrCreateAccountAsync(long storeId, string code, string nameAr, AccountType type, string parentCode)
    {
        var existing = await _context.Accounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId && a.Code == code);
        if (existing != null)
        {
            if (!existing.IsActive) { existing.IsActive = true; }
            return existing;
        }

        var parent = await _context.Accounts
            .FirstOrDefaultAsync(a => a.StoreId == storeId && a.Code == parentCode);
        var account = new Account
        {
            StoreId = storeId,
            Code = code,
            NameAr = nameAr,
            AccountType = type,
            ParentAccountId = parent?.Id,
            IsActive = true,
            IsSystem = false
        };
        _context.Accounts.Add(account);
        await _context.SaveChangesAsync();
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

        // ⚠️ إصلاح: الترقيم كان بالاعتماد على Count (عدد الفواتير) مما يسبب تكرار/قفز الأرقام
        // عند حذف فاتورة أو فشل عملية وسط الترنزاكشن. الحل: أكبر رقم تسلسلي موجود + 1.
        var existing = await _context.Set<Invoice>()
            .Where(i => i.StoreId == storeId && i.InvoiceType == type)
            .Select(i => i.InvoiceNumber)
            .ToListAsync();

        var maxSeq = existing
            .Select(n =>
            {
                var idx = n.LastIndexOf('-');
                return idx >= 0 && int.TryParse(n[(idx + 1)..], out var v) ? v : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}-{(maxSeq + 1):D6}";
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
            decimal totalDiscount = 0m;
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

                // ⚠️ إصلاح الفاتورة الصفرية: عند عدم إرسال سعر (POS أو أجهزة) يُؤخذ سعر المنتج الفعلي
                // (سعر الخصم إن وُجد وإلا السعر الأساسي) — السعر مصدره الخادم وليس العميل.
                var unitPrice = item.UnitPrice > 0
                    ? item.UnitPrice
                    : (product.DiscountPrice is > 0 ? product.DiscountPrice.Value : product.BasePrice);
                var lineTotal = unitPrice * item.Quantity;
                if (item.DiscountAmount < 0 || item.DiscountAmount > lineTotal)
                    throw new InvalidOperationException($"خصم بند '{product.NameAr}' غير صالح (يجب أن يكون بين 0 والإجمالي)");
                var lineAfterDiscount = lineTotal - item.DiscountAmount;

                subTotal += lineTotal;
                totalDiscount += item.DiscountAmount;
                totalCogs += product.CostPrice * item.Quantity;

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = product.NameAr,
                    ProductCodeSnapshot = product.Sku,
                    ProductStatusSnapshot = product.Status.ToString(),
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    LineTotal = lineTotal,
                    DiscountAmount = item.DiscountAmount,
                    LineAfterDiscount = lineAfterDiscount
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

            var netTotal = subTotal - totalDiscount;
            var taxAmount = store.IsVatRegistered ? Math.Round(netTotal * VatRate, 2) : 0m;
            var totalAmount = netTotal + taxAmount;

            var debitAccount = paymentMethod == InvoicePaymentMethod.Cash
                ? await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)")
                : paymentMethod is InvoicePaymentMethod.Mada or InvoicePaymentMethod.Tabby or InvoicePaymentMethod.Tamara
                    ? await GetAccountByCodeAsync(storeId, "1102", "البنك (حساب جاري)")
                    : await GetAccountByCodeAsync(storeId, "1103", "العملاء (ذمم مدينة)");

            var revenueAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Revenue, "مبيعات", "إيرادات المبيعات");
            var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");
            var cogsAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Expense, "تكلفة البضاعة", "تكلفة البضاعة المباعة");

            var lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = debitAccount.Id, Debit = totalAmount, Credit = 0, LineDescription = "إجمالي فاتورة البيع" },
                new JournalEntryLine { AccountId = revenueAccount.Id, Debit = 0, Credit = netTotal, LineDescription = "إيراد المبيعات (بعد الخصم)" }
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
                Status = JournalEntryStatus.Approved,
                CreatedByUserId = userId,
                ApprovedByUserId = userId,
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
                // ⚠️ إصلاح: الدفع النقدي يُعتبر مدفوعًا فورًا (كان بيتسجل Pending للأبد)
                PaymentStatus = paymentMethod is InvoicePaymentMethod.Cash or InvoicePaymentMethod.Mada or InvoicePaymentMethod.Tabby or InvoicePaymentMethod.Tamara ? PaymentStatus.Paid : PaymentStatus.Pending,
                SubTotal = subTotal,
                DiscountAmount = totalDiscount,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                Notes = dto.Notes,
                PartyPhone = dto.GuestPhone,
                PartyCity = dto.GuestCity,
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
            decimal totalDiscount = 0m;

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

                // عند عدم إرسال سعر في الشراء يُؤخذ سعر التكلفة الحالي للمنتج كقيمة افتراضية دفاعية.
                var unitPrice = item.UnitPrice > 0 ? item.UnitPrice : product.CostPrice;
                var lineTotal = unitPrice * item.Quantity;
                if (item.DiscountAmount < 0 || item.DiscountAmount > lineTotal)
                    throw new InvalidOperationException($"خصم بند '{product.NameAr}' غير صالح (يجب أن يكون بين 0 والإجمالي)");
                var lineAfterDiscount = lineTotal - item.DiscountAmount;

                subTotal += lineTotal;
                totalDiscount += item.DiscountAmount;

                invoiceItems.Add(new InvoiceItem
                {
                    ProductId = product.Id,
                    VariantId = item.VariantId,
                    ProductNameSnapshot = product.NameAr,
                    ProductCodeSnapshot = product.Sku,
                    ProductStatusSnapshot = product.Status.ToString(),
                    Quantity = item.Quantity,
                    UnitPrice = unitPrice,
                    LineTotal = lineTotal,
                    DiscountAmount = item.DiscountAmount,
                    LineAfterDiscount = lineAfterDiscount
                });

                // ⚠️ القرار الهندسي الأهم في هذا التاسك: تحديث تكلفة المنتج بالمتوسط المرجّح
                // عند كل عملية شراء. لا يوجد منطق مشابه في المشروع قبل هذا التاسك (تأكدت بمراجعة
                // ProductService.cs فعليًا) — هذا أول تطبيق له.
                var stock = await _context.InventoryStocks.FirstOrDefaultAsync(s =>
                    s.WarehouseId == warehouse.Id && s.ProductId == product.Id && s.VariantId == item.VariantId);

                var oldQty = stock?.QuantityAvailable ?? 0;
                var oldCost = product.CostPrice;
                var newQty = oldQty + item.Quantity;
                var unitCost = item.Quantity > 0 ? lineAfterDiscount / item.Quantity : 0m; // التكلفة الفعلية بعد خصم البند

                product.CostPrice = newQty > 0
                    ? Math.Round(((oldQty * oldCost) + (item.Quantity * unitCost)) / newQty, 2)
                    : unitCost;
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

            var netTotal = subTotal - totalDiscount;
            var taxAmount = store.IsVatRegistered ? Math.Round(netTotal * VatRate, 2) : 0m;
            var totalAmount = netTotal + taxAmount;

            var creditAccount = paymentMethod == InvoicePaymentMethod.Cash
                ? await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)")
                : await GetAccountByCodeAsync(storeId, "2101", "الموردون (ذمم دائنة)");

            var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");

            var lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = netTotal, Credit = 0, LineDescription = "إضافة مخزون بضاعة الشراء (بعد الخصم)" }
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
                Status = JournalEntryStatus.Approved,
                CreatedByUserId = userId,
                ApprovedByUserId = userId,
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
                // ⚠️ إصلاح: الدفع النقدي يُعتبر مدفوعًا فورًا
                PaymentStatus = paymentMethod == InvoicePaymentMethod.Cash ? PaymentStatus.Paid : PaymentStatus.Pending,
                SubTotal = subTotal,
                DiscountAmount = totalDiscount,
                TaxAmount = taxAmount,
                TotalAmount = totalAmount,
                Notes = dto.Notes,
                PartyPhone = dto.SupplierPhone,
                PartyCity = dto.SupplierCity,
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

    public async Task<PagedResult<InvoiceDto>> GetInvoicesAsync(long userId, string? invoiceType, DateOnly? from, DateOnly? to, int page = 1, int pageSize = 20)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var query = _context.Set<Invoice>()
            .Include(i => i.Items)
            .Include(i => i.JournalEntry)
            .Include(i => i.Customer)
            .Where(i => i.StoreId == storeId);

        if (!string.IsNullOrWhiteSpace(invoiceType) && Enum.TryParse<InvoiceType>(invoiceType, true, out var typeEnum))
            query = query.Where(i => i.InvoiceType == typeEnum);

        if (from.HasValue)
            query = query.Where(i => i.InvoiceDate >= from.Value);
        if (to.HasValue)
            query = query.Where(i => i.InvoiceDate <= to.Value);

        var totalCount = await query.CountAsync();

        var invoices = await query
            .OrderByDescending(i => i.InvoiceDate)
            .ThenByDescending(i => i.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId);
        var items = invoices.Select(i => EnrichInvoiceWithStore(MapInvoiceToDto(i), store, includeQr: false)).ToList();

        return new PagedResult<InvoiceDto>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount,
            TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
            Items = items
        };
    }

    public async Task<InvoiceDto> GetInvoiceByIdAsync(long userId, long invoiceId)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var invoice = await _context.Set<Invoice>()
            .Include(i => i.Items)
            .Include(i => i.JournalEntry)
            .Include(i => i.Customer)
            .FirstOrDefaultAsync(i => i.Id == invoiceId && i.StoreId == storeId);

        if (invoice == null)
            throw new InvalidOperationException("الفاتورة غير موجودة");

        var store = await _context.Stores
            .Include(s => s.Package)
            .FirstOrDefaultAsync(s => s.Id == storeId);
        return EnrichInvoiceWithStore(MapInvoiceToDto(invoice), store, zatcaEnabled: store?.Package?.HasZatcaInvoice ?? false);
    }

    private static InvoiceDto MapInvoiceToDto(Invoice inv) => new InvoiceDto
    {
        Id = inv.Id,
        InvoiceType = inv.InvoiceType.ToString(),
        InvoiceNumber = inv.InvoiceNumber,
        InvoiceDate = inv.InvoiceDate,
        CustomerId = inv.CustomerId,
        PartyName = inv.PartyName,
        // رقم العميل المسجّل يُجلب من حساب العميل، وللضيف/المورد من حقل الطرف
        PartyPhone = string.IsNullOrWhiteSpace(inv.PartyPhone) ? inv.Customer?.Phone : inv.PartyPhone,
        PartyCity = inv.PartyCity,
        Notes = inv.Notes,
        PaymentMethod = inv.PaymentMethod.ToString(),
        PaymentStatus = inv.PaymentStatus.ToString(),
        SubTotal = inv.SubTotal,
        DiscountAmount = inv.DiscountAmount,
        TaxAmount = inv.TaxAmount,
        TotalAmount = inv.TotalAmount,
        CostOfGoodsSold = inv.CostOfGoodsSold,
        JournalEntryId = inv.JournalEntryId,
        JournalEntryNumber = inv.JournalEntry?.EntryNumber,
        ZatcaStatus = inv.ZatcaStatus.ToString(),
        ZatcaUuid = inv.ZatcaUuid,
        ZatcaReportingStatus = inv.ZatcaReportingStatus,
        ZatcaValidationResults = inv.ZatcaValidationResults,
        ZatcaHash = inv.ZatcaHash,
        QrBase64 = inv.ZatcaQrBase64,
        ZatcaSubmissionDateTime = inv.ZatcaSubmissionDateTime,
        Items = inv.Items.Select(i => new InvoiceItemDto
        {
            Id = i.Id,
            ProductId = i.ProductId,
            VariantId = i.VariantId,
            ProductNameSnapshot = i.ProductNameSnapshot,
            ProductCodeSnapshot = i.ProductCodeSnapshot,
            ProductStatusSnapshot = i.ProductStatusSnapshot,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            LineTotal = i.LineTotal,
            DiscountAmount = i.DiscountAmount,
            LineAfterDiscount = i.LineAfterDiscount
        }).ToList()
    };

    // ⚠️ إضافة (فاتورة إلكترونية): إثراء الـ DTO ببيانات المتجر + توليد QR ضريبة هيئة الزكاة
    // لفواتير البيع فقط (مطلوب للطباعة/التصدير). QR بيتولّد من: اسم المتجر، الرقم الضريبي،
    // التاريخ/الوقت، الإجمالي شامل الضريبة، وقيمة الضريبة. includeQr=false للقوائم (أخف).
    private static InvoiceDto EnrichInvoiceWithStore(InvoiceDto dto, Store store, bool includeQr = true, bool zatcaEnabled = true)
    {
        dto.StoreName = store.StoreName;
        dto.StoreLogo = store.Logo;
        dto.ContactPhone = store.ContactPhone;
        dto.ContactEmail = store.ContactEmail;
        dto.ContactAddress = store.ContactAddress;
        dto.BranchName = store.BranchName;
        dto.CommercialRegistrationNumber = store.CommercialRegistrationNumber;
        dto.VatNumber = store.VatNumber;
        dto.IsVatRegistered = store.IsVatRegistered;
        dto.VatRate = VatRate;

        // فرض ميزة الباقة: فواتير زاتكا (QR الضريبي) تتطلب تفعيل الميزة في الباقة.
        // QR الموقّع (من زاتكا) يُفضَّل إن وُجد، وإلا يُولَّد QR مبني على بيانات الفاتورة نفسها.
        if (includeQr && dto.InvoiceType == "Sales" && store.IsVatRegistered
            && !string.IsNullOrWhiteSpace(store.VatNumber) && zatcaEnabled)
        {
            if (string.IsNullOrWhiteSpace(dto.QrBase64))
            {
                var dateTime = dto.InvoiceDate.ToDateTime(TimeOnly.MinValue);
                dto.QrBase64 = ZatcaQrHelper.BuildQrBase64(
                    store.StoreName,
                    store.VatNumber,
                    dateTime,
                    dto.TotalAmount,
                    dto.TaxAmount);
            }
        }

        return dto;
    }
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
            PaymentMethod = string.IsNullOrWhiteSpace(dto.PaymentMethod) ? "Cash" : dto.PaymentMethod.Trim(),
            Items = dto.Items
        };

        return await CreateSalesInvoiceAsync(userId, salesDto);
    }

    // ⚠️ إضافة (تسوية الوردية): عند إغلاق وردية كاشير، الفرق بين النقدية المتوقعة
    // (StartingCash + مبيعات الكاش) والنقدية الفعلية المعدودة يُرحَّل كقيد محاسبي حتى
    // تظهر الزيادة/العجز في دفتر الأستاذ والتقارير المالية بدل ضياعها خارج المحاسبة.
    // variance > 0 → زيادة نقدية (إيراد فرق الوردية)، variance < 0 → عجز نقدي (مصروف).
    public async Task CreatePosShiftVarianceEntryAsync(long storeId, long userId, decimal variance)
    {
        if (Math.Abs(variance) < 0.01m) return; // لا فرق — لا حاجة لقيد

        var cashAccount = await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)");
        var amount = Math.Abs(variance);

        List<JournalEntryLine> lines;
        string description;

        if (variance > 0)
        {
            // زيادة: الصندوق زادت فعليًا عن المتوقع → مدين الصندوق / دائن إيراد فرق الوردية
            var overageAccount = await GetOrCreateAccountAsync(storeId, "4102", "إيرادات فرق الوردية (زيادة)", AccountType.Revenue, "4");
            lines = new List<JournalEntryLine>
            {
                new() { AccountId = cashAccount.Id, Debit = amount, Credit = 0, LineDescription = "زيادة نقدية عند إغلاق وردية الكاشير" },
                new() { AccountId = overageAccount.Id, Debit = 0, Credit = amount, LineDescription = "زيادة نقدية عند إغلاق وردية الكاشير" }
            };
            description = "قيد تلقائي — فرق زيادة نقدية في وردية الكاشير";
        }
        else
        {
            // عجز: الصندوق أقل من المتوقع → مدين مصروف فرق الوردية / دائن الصندوق
            var shortageAccount = await GetOrCreateAccountAsync(storeId, "5105", "مصروف فرق الوردية (عجز)", AccountType.Expense, "5");
            lines = new List<JournalEntryLine>
            {
                new() { AccountId = shortageAccount.Id, Debit = amount, Credit = 0, LineDescription = "عجز نقدي عند إغلاق وردية الكاشير" },
                new() { AccountId = cashAccount.Id, Debit = 0, Credit = amount, LineDescription = "عجز نقدي عند إغلاق وردية الكاشير" }
            };
            description = "قيد تلقائي — فرق عجز نقدي في وردية الكاشير";
        }

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = description,
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = userId,
            ApprovedByUserId = userId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.POS,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
    }

    // ⚠️ إصلاح بند "الأرصدة 0 في دفتر الأستاذ": طلبات المتجر الإلكتروني (الـ Checkout) كانت
    // تُنشئ طلبًا فقط دون أي قيد محاسبي، فكل مبيعات المتجر العام تسقط تمامًا من دفتر الأستاذ
    // وميزان المراجعة (حساب 1101 مثلاً يبقى صفرًا). هذه الدالة تُرحّل الطلب محاسبيًا:
    // فاتورة بيع + قيد تلقائي معتمد فورًا، بنفس منطق CreateSalesInvoiceAsync لكن دون خصم مخزون
    // (خصم المخزون تم بالفعل في CheckoutAsync) ودون إشعارات (الـ Owner يُشعَر بالطلب أصلًا).
    public async Task CreateSalesInvoiceForOrderAsync(long storeId, long orderId)
    {
        var store = await _context.Stores.FirstOrDefaultAsync(s => s.Id == storeId)
            ?? throw new InvalidOperationException("المتجر غير موجود");

        var order = await _context.Orders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId)
            ?? throw new InvalidOperationException("الطلب غير موجود");

        if (order.Items.Count == 0)
            throw new InvalidOperationException("لا يمكن ترحيل طلب لا يحتوي على عناصر");

        // ⚠️ حماية من الترحيل المكرر لنفس الطلب (حتى لو أُعيد استدعاؤها بعد فشل جزئي):
        // يتم البحث عن قيد تلقائي يحمل رقم الطلب نفسه في وصفه — لا يوجد حقل OrderId في الفاتورة بعد.
        var alreadyPosted = await _context.Set<JournalEntry>()
            .AnyAsync(e => e.StoreId == storeId
                        && e.SourceType == JournalSourceType.SalesInvoice
                        && e.Description == $"قيد تلقائي — طلب المتجر {order.OrderNumber}");
        if (alreadyPosted)
            return;

        var productIds = order.Items.Select(i => i.ProductId).Distinct().ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, p => p);

        decimal subTotal = 0m, totalCogs = 0m;
        foreach (var item in order.Items)
        {
            subTotal += item.LineTotal;
            var cost = products.TryGetValue(item.ProductId, out var p) ? p.CostPrice : 0m;
            totalCogs += cost * item.Quantity;
        }

        var netTotal = subTotal - order.DiscountAmount;
        // ⚠️ نفس منطق الضريبة المعتمد في CreateSalesInvoiceAsync حرفيًا (لا تغيير): 15% فقط للمتاجر المسجلة ضريبيًا
        var taxAmount = store.IsVatRegistered ? Math.Round(netTotal * VatRate, 2) : 0m;
        // ⚠️ إصلاح تناقض الشحن: تكلفة الشحن التي يدفعها العميل كانت تسقط من الترحيل المحاسبي،
        // وكان الإجمالي المحاسبي أكبر من المدفوع فعلاً عند وجود ضريبة. الآن الإجمالي =
        // صافي البضاعة + الضريبة + الشحن (يطابق تمامًا TotalAmount المحسوب في الـ Checkout).
        var shippingAmount = order.ShippingCost;
        var totalAmount = netTotal + taxAmount + shippingAmount;

        // ⚠️ نموذج المنصة المركزي: يُرحَّل "التزام مستحق للتاجر" بجانب الإيراد —
        // عمولة المنصة تُحتسب من قيمة البضاعة (صافي البضاعة بعد الخصم)، وأجرة الشحن
        // تُخصم من المستحقات فقط إذا كانت على حساب المنصة (ShippingOnPlatformAccount).
        var commission = 0m;
        if (store.Package != null && store.Package.CommissionPercentage > 0)
            commission = Math.Round(netTotal * store.Package.CommissionPercentage / 100m, 2);
        var shippingDeducted = store.ShippingOnPlatformAccount ? shippingAmount : 0m;
        var merchantNet = totalAmount - commission - shippingDeducted;
        if (merchantNet < 0) merchantNet = 0m;

        // ⚠️ قرار هندسي: الدفع عند الاستلام (COD) يُسجَّل على العملاء (ذمم مدينة) 1103 لأنه مبلغ
        // مستحق التحصيل لاحقًا، بينما الدفع الإلكتروني المسبق يُسجَّل نقدًا (1101) — نفس معالجة
        // CreateSalesInvoiceAsync (Cash → 1101 / Credit → 1103).
        var isCod = order.PaymentMethodType == PaymentMethodType.CashOnDelivery;
        var debitAccount = isCod
            ? await GetAccountByCodeAsync(storeId, "1103", "العملاء (ذمم مدينة)")
            : await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)");

        var revenueAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Revenue, "مبيعات", "إيرادات المبيعات");
        var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");
        var cogsAccount = await GetAccountByTypeAndKeywordAsync(storeId, AccountType.Expense, "تكلفة البضاعة", "تكلفة البضاعة المباعة");

        var lines = new List<JournalEntryLine>
        {
            new JournalEntryLine { AccountId = debitAccount.Id, Debit = merchantNet, Credit = 0, LineDescription = $"صافي مستحق التاجر — طلب {order.OrderNumber}" },
            new JournalEntryLine { AccountId = revenueAccount.Id, Debit = 0, Credit = netTotal, LineDescription = "إيراد المبيعات (بعد الخصم)" }
        };

        if (taxAmount > 0)
        {
            var vatSalesAccount = await GetAccountByCodeAsync(storeId, "2102", "ضريبة القيمة المضافة على المبيعات");
            lines.Add(new JournalEntryLine { AccountId = vatSalesAccount.Id, Debit = 0, Credit = taxAmount, LineDescription = "ضريبة القيمة المضافة على المبيعات" });
        }

        if (shippingAmount > 0)
        {
            var shippingRevenueAccount = await GetOrCreateAccountAsync(storeId, "4103", "إيرادات الشحن", AccountType.Revenue, "4");
            lines.Add(new JournalEntryLine { AccountId = shippingRevenueAccount.Id, Debit = 0, Credit = shippingAmount, LineDescription = "إيراد الشحن" });
        }

        if (totalCogs > 0)
        {
            lines.Add(new JournalEntryLine { AccountId = cogsAccount.Id, Debit = totalCogs, Credit = 0, LineDescription = "تكلفة البضاعة المباعة" });
            lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0, Credit = totalCogs, LineDescription = "خصم المخزون المباع" });
        }

        if (commission > 0)
        {
            var commissionExpenseAccount = await GetOrCreateAccountAsync(storeId, "5106", "مصروف عمولة المنصة", AccountType.Expense, "5");
            lines.Add(new JournalEntryLine { AccountId = commissionExpenseAccount.Id, Debit = commission, Credit = 0, LineDescription = "عمولة المنصة على الطلب" });
        }

        if (shippingDeducted > 0)
        {
            var platformShippingExpenseAccount = await GetOrCreateAccountAsync(storeId, "5109", "مصروف شحن تدفعه المنصة", AccountType.Expense, "5");
            lines.Add(new JournalEntryLine { AccountId = platformShippingExpenseAccount.Id, Debit = shippingDeducted, Credit = 0, LineDescription = "أجرة شحن على حساب المنصة" });
        }

        if (merchantNet > 0)
        {
            var merchantPayableAccount = await GetOrCreateAccountAsync(storeId, "2104", "التزام مستحق للتاجر (المنصة)", AccountType.Liability, "2");
            lines.Add(new JournalEntryLine { AccountId = merchantPayableAccount.Id, Debit = 0, Credit = merchantNet, LineDescription = "التزام مستحق للتاجر — طلب " + order.OrderNumber });
        }

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = $"قيد تلقائي — طلب المتجر {order.OrderNumber}",
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = store.OwnerUserId,
            ApprovedByUserId = store.OwnerUserId,
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
            InvoiceDate = DateOnly.FromDateTime(DateTime.UtcNow),
            CustomerId = order.CustomerId,
            PartyName = order.CustomerId == null ? order.GuestName : null,
            PartyPhone = order.CustomerId == null ? order.GuestPhone : null,
            PartyCity = null,
            Notes = order.Notes,
            PaymentMethod = isCod ? InvoicePaymentMethod.Credit : InvoicePaymentMethod.Cash,
            PaymentStatus = isCod ? PaymentStatus.Pending : PaymentStatus.Paid,
            SubTotal = subTotal,
            DiscountAmount = order.DiscountAmount,
            TaxAmount = taxAmount,
            TotalAmount = totalAmount,
            CostOfGoodsSold = totalCogs,
            CreatedByUserId = store.OwnerUserId,
            JournalEntryId = journalEntry.Id,
            Items = order.Items.Select(i =>
            {
                products.TryGetValue(i.ProductId, out var p);
                return new InvoiceItem
                {
                    ProductId = i.ProductId,
                    VariantId = i.VariantId,
                    ProductNameSnapshot = i.ProductNameSnapshot,
                    ProductCodeSnapshot = p?.Sku,
                    ProductStatusSnapshot = p?.Status.ToString(),
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPriceSnapshot,
                    LineTotal = i.LineTotal,
                    DiscountAmount = 0m,
                    LineAfterDiscount = i.LineTotal
                };
            }).ToList()
        };
        _context.Set<Invoice>().Add(invoice);
        await _context.SaveChangesAsync();
    }

    // ⚠️ عكس قيد بيع الطلب تلقائيًا (استرداد كامل للبيع) + ترحيل الفاتورة كمرتجعة:
    // يُنشأ قيد عكسي يعكس المدين والدائن لقيد المبيعات الأصلي، ويُعلَّم القيد الأصلي كمعكوس،
    // وتُحدَّث الفاتورة المرتبطة (SalesInvoice) إلى حالة Refunded.
    public async Task ReverseOrderSalesInvoiceAsync(long storeId, long orderId)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(o => o.Id == orderId && o.StoreId == storeId);
        if (order == null)
            throw new InvalidOperationException("الطلب غير موجود");

        var description = $"قيد تلقائي — طلب المتجر {order.OrderNumber}";

        var original = await _context.Set<JournalEntry>()
            .Include(e => e.Lines)
            .FirstOrDefaultAsync(e => e.StoreId == storeId
                                   && e.SourceType == JournalSourceType.SalesInvoice
                                   && e.Description == description);
        if (original == null || original.Status != JournalEntryStatus.Approved)
            return;

        var alreadyReversed = await _context.Set<JournalEntry>()
            .AnyAsync(e => e.ReversalOfEntryId == original.Id);
        if (alreadyReversed)
            return;

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var reversal = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = $"قيد عكسي للقيد رقم {original.EntryNumber}",
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = original.CreatedByUserId,
            ApprovedByUserId = original.CreatedByUserId,
            ReversalOfEntryId = original.Id,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.SalesInvoice,
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

        var invoice = await _context.Set<Invoice>()
            .FirstOrDefaultAsync(i => i.JournalEntryId == original.Id);
        if (invoice != null)
        {
            invoice.PaymentStatus = PaymentStatus.Refunded;
            invoice.UpdatedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
    }

    // ⚠️ ترحيل قيد تسوية مستحقات التاجر (Settlement): عند تنفيذ التحويل الفعلي للتاجر
    // يُصفَّر حساب "التزام مستحق للتاجر" (2104) ويُدان حساب البنك/النقدية.
    public async Task CreateSettlementPaymentEntryAsync(long storeId, string batchNumber, decimal netAmount, long createdByUserId)
    {
        if (netAmount <= 0)
            return;

        var merchantPayableAccount = await GetOrCreateAccountAsync(storeId, "2104", "التزام مستحق للتاجر (المنصة)", AccountType.Liability, "2");
        var bankAccount = await GetAccountByCodeAsync(storeId, "1102", "البنك");

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = $"قيد تلقائي — تسوية مستحقات التاجر ({batchNumber})",
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = createdByUserId,
            ApprovedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Settlement,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = merchantPayableAccount.Id, Debit = netAmount, Credit = 0, LineDescription = "تسوية التزام مستحق للتاجر" },
                new JournalEntryLine { AccountId = bankAccount.Id, Debit = 0, Credit = netAmount, LineDescription = "تحويل دفعة التسوية للتاجر" }
            }
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
    }

    // ⚠️ قيد مصروف التالف: مدين "مصروف التالف" (5107) / دائن المخزون (1104).
    public async Task CreateDamageExpenseEntryAsync(long storeId, decimal amount, string description, long createdByUserId)
    {
        if (amount <= 0)
            return;

        var damageExpenseAccount = await GetOrCreateAccountAsync(storeId, "5107", "مصروف التالف", AccountType.Expense, "5");
        var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = description,
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = createdByUserId,
            ApprovedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Inventory,
            Lines = new List<JournalEntryLine>
            {
                new JournalEntryLine { AccountId = damageExpenseAccount.Id, Debit = amount, Credit = 0, LineDescription = "تكلفة البضاعة التالفة" },
                new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0, Credit = amount, LineDescription = "خروج المخزون التالف" }
            }
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
    }

    // ⚠️ قيد فرق الجرد: العجز مدين "مصروف عجز الجرد" (5108) / دائن المخزون (1104)،
    // والفائض مدين المخزون (1104) / دائن "إيراد فائض الجرد" (4104).
    public async Task CreateStockCountVarianceEntryAsync(long storeId, decimal shortageAmount, decimal overageAmount, string description, long createdByUserId)
    {
        var inventoryAccount = await GetAccountByCodeAsync(storeId, "1104", "المخزون");
        var lines = new List<JournalEntryLine>();

        if (shortageAmount > 0)
        {
            var shortageExpenseAccount = await GetOrCreateAccountAsync(storeId, "5108", "مصروف عجز الجرد", AccountType.Expense, "5");
            lines.Add(new JournalEntryLine { AccountId = shortageExpenseAccount.Id, Debit = shortageAmount, Credit = 0, LineDescription = "عجز الجرد" });
            lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = 0, Credit = shortageAmount, LineDescription = "خصم عجز الجرد من المخزون" });
        }

        if (overageAmount > 0)
        {
            var overageRevenueAccount = await GetOrCreateAccountAsync(storeId, "4104", "إيراد فائض الجرد", AccountType.Revenue, "4");
            lines.Add(new JournalEntryLine { AccountId = inventoryAccount.Id, Debit = overageAmount, Credit = 0, LineDescription = "إضافة فائض الجرد للمخزون" });
            lines.Add(new JournalEntryLine { AccountId = overageRevenueAccount.Id, Debit = 0, Credit = overageAmount, LineDescription = "إيراد فائض الجرد" });
        }

        if (lines.Count == 0)
            return;

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Description = description,
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = createdByUserId,
            ApprovedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Inventory,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
    }

    private async Task<string> GenerateVoucherNumberAsync(long storeId, VoucherType type)
    {
        var prefix = type == VoucherType.Receipt ? "RV" : "PV";
        // ⚠️ إصلاح: نفس منطق أكبر رقم تسلسلي + 1 بدلًا من العدد — لتفادي تكرار/قفز الأرقام.
        var existing = await _context.Set<Voucher>()
            .Where(v => v.StoreId == storeId && v.VoucherType == type)
            .Select(v => v.VoucherNumber)
            .ToListAsync();

        var maxSeq = existing
            .Select(n =>
            {
                var idx = n.LastIndexOf('-');
                return idx >= 0 && int.TryParse(n[(idx + 1)..], out var v) ? v : 0;
            })
            .DefaultIfEmpty(0)
            .Max();

        return $"{prefix}-{(maxSeq + 1):D6}";
    }

    private async Task<Account> GetCashOrBankAccountAsync(long storeId, VoucherPaymentMethod method)
    {
        // ⚠️ نقدي فقط يتقيد على حساب الصندوق. أي طريقة تانية (بنكي/تحويل/شيك/أخرى)
        // تتقيد على حساب البنك — نفس المنطق القديم بتاع "Bank" اتوسّع ليشمل باقي الطرق الجديدة.
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
            throw new InvalidOperationException("طريقة الدفع غير صحيحة (Cash, Bank, Transfer, Cheque, Other)");

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
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = userId,
            ApprovedByUserId = userId,
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

    public async Task<VoucherDto> GetVoucherByIdAsync(long userId, long voucherId)
        => await GetVoucherByIdInternalAsync(userId, voucherId);

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
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = createdByUserId,
            ApprovedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Payroll,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();
 
        // ⚠️ إضافة (ربط الإشعارات) — إشعار الـ Owner بقيد راتب جديد (معتمد فورًا مثل باقي القيود التلقائية)
        try
        {
            var ownerUserId = await GetStoreOwnerUserIdAsync(storeId);
            if (ownerUserId != 0 && ownerUserId != createdByUserId)
            {
                await _notificationService.CreateAsync(
                    ownerUserId,
                    "قيد راتب جديد",
                    $"تم تسجيل قيد راتب {employeeName} بقيمة {netSalary} ر.س لفترة {periodMonth:yyyy-MM} في الدفتر المحاسبي",
                    NotificationType.PayrollJournalEntryCreated,
                    $"/dashboard/accounting/journal-entries/{journalEntry.Id}");
            }
        }
        catch { /* فشل الإشعار لا يجب أن يوقف نجاح إنشاء قيد الراتب */ }
 
        return await GetJournalEntryByIdAsync(createdByUserId, journalEntry.Id);
    }

    public async Task<JournalEntryDto> CreatePayrollPaymentJournalEntryAsync(long storeId, long createdByUserId, string employeeName, decimal netSalary, DateOnly periodMonth)
    {
        if (netSalary <= 0)
            throw new InvalidOperationException("لا يمكن توليد قيد محاسبي لصرف راتب بقيمة صفرية أو سالبة");

        // عند الصرف الفعلي للراتب: مدين "رواتب مستحقة الدفع" (2103) لتصفير الالتزام
        // ودائن "الصندوق (النقدية)" (1101) — يُغلق التزام الرواتب المستحقة من قيد الاعتماد.
        var salariesPayableAccount = await GetAccountByCodeAsync(storeId, "2103", "رواتب مستحقة الدفع");
        var cashAccount = await GetAccountByCodeAsync(storeId, "1101", "الصندوق (النقدية)");

        var lines = new List<JournalEntryLine>
        {
            new JournalEntryLine { AccountId = salariesPayableAccount.Id, Debit = netSalary, Credit = 0, LineDescription = $"تسوية راتب مستحق الدفع — {employeeName}" },
            new JournalEntryLine { AccountId = cashAccount.Id, Debit = 0, Credit = netSalary, LineDescription = $"صرف راتب نقدًا — {employeeName}" }
        };

        var entryNumber = await GenerateEntryNumberAsync(storeId);
        // تاريخ الصرف الفعلي (اليوم)، بنفس نمط قيد الاعتماد.
        var entryDate = DateOnly.FromDateTime(DateTime.UtcNow);

        var journalEntry = new JournalEntry
        {
            StoreId = storeId,
            EntryNumber = entryNumber,
            EntryDate = entryDate,
            Description = $"قيد تلقائي — صرف راتب {employeeName} لفترة {periodMonth:yyyy-MM}",
            Status = JournalEntryStatus.Approved,
            CreatedByUserId = createdByUserId,
            ApprovedByUserId = createdByUserId,
            IsAutoGenerated = true,
            SourceType = JournalSourceType.Payroll,
            Lines = lines
        };
        _context.Set<JournalEntry>().Add(journalEntry);
        await _context.SaveChangesAsync();

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

    public async Task<TrialBalanceDto> GetTrialBalanceAsync(long userId, DateOnly? from, DateOnly? to, string? accountType, string? sourceType)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var accountsQuery = _context.Accounts.Where(a => a.StoreId == storeId);
        if (!string.IsNullOrWhiteSpace(accountType) && Enum.TryParse<AccountType>(accountType, true, out var typeFilter))
            accountsQuery = accountsQuery.Where(a => a.AccountType == typeFilter);
        var accounts = await accountsQuery.OrderBy(a => a.Code).ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();

        var query = _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && accountIds.Contains(l.AccountId));

        if (!string.IsNullOrWhiteSpace(sourceType) && Enum.TryParse<JournalSourceType>(sourceType, true, out var sourceFilter))
            query = query.Where(l => l.JournalEntry.SourceType == sourceFilter);

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

    public async Task<IncomeStatementDto> GetIncomeStatementAsync(long userId, DateOnly? from, DateOnly? to, string? accountType, string? sourceType)
    {
        var (storeId, _, _) = await ResolveStoreAndRoleAsync(userId);

        var accountsQuery = _context.Accounts
            .Where(a => a.StoreId == storeId && (a.AccountType == AccountType.Revenue || a.AccountType == AccountType.Expense));
        if (!string.IsNullOrWhiteSpace(accountType) && Enum.TryParse<AccountType>(accountType, true, out var typeFilter)
            && (typeFilter == AccountType.Revenue || typeFilter == AccountType.Expense))
            accountsQuery = accountsQuery.Where(a => a.AccountType == typeFilter);
        var accounts = await accountsQuery.OrderBy(a => a.Code).ToListAsync();

        var accountIds = accounts.Select(a => a.Id).ToList();

        var query = _context.Set<JournalEntryLine>()
            .Include(l => l.JournalEntry)
            .Where(l => l.JournalEntry.StoreId == storeId
                     && l.JournalEntry.Status == JournalEntryStatus.Approved
                     && accountIds.Contains(l.AccountId));

        if (!string.IsNullOrWhiteSpace(sourceType) && Enum.TryParse<JournalSourceType>(sourceType, true, out var sourceFilter))
            query = query.Where(l => l.JournalEntry.SourceType == sourceFilter);

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