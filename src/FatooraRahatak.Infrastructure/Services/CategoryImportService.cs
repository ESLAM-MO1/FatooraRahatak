using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class CategoryImportService : ICategoryImportService
{
    public const int MaxRows = 500;
    private const int MaxErrorsReturned = 200;

    private sealed record ColumnDef(
        string Key, string HeaderAr, string HeaderEn, bool Required, bool IsText,
        double Width, string Example, string Desc, string[] Aliases);

    private sealed record RawRow(int RowNumber, Dictionary<string, string?> Cells);

    private sealed record RowInput(
        int RowNumber, string NameAr, string NameEn,
        string? ParentName, string? ParentKey, int SortOrder, string Key);

    private static readonly ColumnDef[] Columns =
    {
        new("nameAr", "التصنيف (عربي)", "Category (AR)", true, false, 30, "إلكترونيات",
            "اسم التصنيف بالعربي (مطلوب) / Category name in Arabic (required)",
            new[] { "التصنيف", "الاسم", "اسم التصنيف", "التصنيفات", "القسم", "اسم القسم", "category name", "arabic name", "name" }),
        new("nameEn", "التصنيف (إنجليزي)", "Category (EN)", false, false, 30, "Electronics",
            "الاسم بالإنجليزي؛ يُنسخ من العربي إذا تُرك فارغًا / English name; copied from the Arabic one when blank",
            new[] { "الاسم (إنجليزي)", "اسم التصنيف (إنجليزي)", "category name en", "english name", "name en" }),
        new("parent", "التصنيف الأب", "Parent Category", false, false, 30, "إلكترونيات",
            "اسم تصنيف آخر لعمل تسلسل؛ فارغ = تصنيف رئيسي، وإذا لم يوجد يُنشأ تلقائيًا / Parent category name for nesting; blank = top level, auto-created when missing",
            new[] { "الأب", "الوالد", "الأب (بالاسم)", "parent category", "parent name" }),
        new("sortOrder", "الترتيب", "Sort Order", false, false, 14, "1",
            "رقم صحيح لترتيب الظهور؛ الافتراضي 0 / Integer display order; default 0",
            new[] { "ترتيب", "الترتيب الظاهر", "order", "sort", "position" }),
    };

    private static readonly string[] Notes =
    {
        "1) كل صف = تصنيف واحد / Each row is one category",
        "2) العمود المطلوب هو الاسم بالعربي؛ وإن تُرك الإنجليزي فارغًا يُنسخ تلقائيًا / Required column: the Arabic name; the English one is copied automatically when blank",
        "3) التصنيف الأب: اكتب اسم تصنيف موجود (في المتجر أو في نفس الملف) لعمل تسلسل؛ وإذا لم يوجد يُنشأ تلقائيًا كتصنيف رئيسي / Parent: type an existing category name (in the store or in this file) to nest; it is auto-created as a top-level category when missing",
        "4) الأسماء الموجودة في المتجر أو المكررة في الملف تُتخطى مع رسالة خطأ / Names already in the store or repeated in the file are skipped with an error",
        "5) الحد الأقصى 500 تصنيف و5 ميجابايت للملف الواحد / Maximum 500 categories and 5 MB per file",
    };

    private static readonly Dictionary<string, string> AliasMap = BuildAliasMap();

    private readonly AppDbContext _context;
    private readonly ICategoryService _categoryService;
    private readonly ILogger<CategoryImportService> _logger;

    public CategoryImportService(
        AppDbContext context,
        ICategoryService categoryService,
        ILogger<CategoryImportService> logger)
    {
        _context = context;
        _categoryService = categoryService;
        _logger = logger;
    }

    // ============================================================
    // Import
    // ============================================================
    public async Task<CategoryImportResultDto> ImportAsync(long storeId, Stream file)
    {
        var rows = ReadRows(file, out var ignored);
        var result = new CategoryImportResultDto { TotalRows = rows.Count, IgnoredColumns = ignored };

        // normalised name -> category id, for everything that already exists in the store
        var known = new Dictionary<string, long>(StringComparer.Ordinal);
        var storeCats = await _context.Categories
            .Where(x => x.StoreId == storeId)
            .Select(x => new { x.Id, x.NameAr, x.NameEn })
            .ToListAsync();
        foreach (var c in storeCats)
        {
            var kAr = Norm(c.NameAr);
            if (kAr.Length > 0) known.TryAdd(kAr, c.Id);
            var kEn = Norm(c.NameEn);
            if (kEn.Length > 0) known.TryAdd(kEn, c.Id);
        }

        void AddErrors(IEnumerable<ProductImportErrorDto> list)
        {
            foreach (var e in list)
            {
                if (result.Errors.Count < MaxErrorsReturned) result.Errors.Add(e);
                else result.ErrorsTruncated = true;
            }
        }

        // ---- pass 1: validate every row ----
        var valid = new List<RowInput>();
        var seen = new HashSet<string>(StringComparer.Ordinal);

        foreach (var row in rows)
        {
            var errs = new List<ProductImportErrorDto>();

            row.Cells.TryGetValue("nameAr", out var rawAr);
            row.Cells.TryGetValue("nameEn", out var rawEn);
            row.Cells.TryGetValue("parent", out var rawParent);
            row.Cells.TryGetValue("sortOrder", out var rawSort);

            var nameAr = string.IsNullOrWhiteSpace(rawAr) ? null : rawAr.Trim();
            var nameEn = string.IsNullOrWhiteSpace(rawEn) ? null : rawEn.Trim();
            if (nameAr == null && nameEn == null)
            {
                errs.Add(NewError(row.RowNumber, "MISSING_NAME", "nameAr"));
            }
            else
            {
                nameAr ??= nameEn;
                nameEn ??= nameAr;
            }

            var sort = 0;
            if (rawSort != null && !TryParseInt(rawSort, out sort))
                errs.Add(NewError(row.RowNumber, "BAD_SORT", "sortOrder", rawSort));

            string? key = null;
            string? parentName = null;
            string? parentKey = null;
            if (nameAr != null)
            {
                key = Norm(nameAr);
                if (key.Length == 0)
                    errs.Add(NewError(row.RowNumber, "MISSING_NAME", "nameAr", nameAr));
                else if (!seen.Add(key))
                    errs.Add(NewError(row.RowNumber, "DUPLICATE", "nameAr", nameAr));

                if (!string.IsNullOrWhiteSpace(rawParent))
                {
                    parentName = rawParent.Trim();
                    parentKey = Norm(parentName);
                    if (parentKey.Length == 0) parentName = null;
                }
            }

            if (nameAr == null || key == null || errs.Count > 0)
            {
                result.FailedCount++;
                AddErrors(errs);
                continue;
            }

            valid.Add(new RowInput(row.RowNumber, nameAr, nameEn!, parentName, parentKey, sort, key));
        }

        // ---- pass 2: create the categories (top level first) ----
        var linkJobs = new List<(RowInput Row, long Id)>();

        foreach (var v in valid)
        {
            if (known.ContainsKey(v.Key))
            {
                result.FailedCount++;
                AddErrors(new[] { NewError(v.RowNumber, "DUPLICATE", "nameAr", v.NameAr) });
                continue;
            }

            try
            {
                var created = await _categoryService.CreateAsync(storeId, new CreateCategoryDto
                {
                    NameAr = v.NameAr,
                    NameEn = v.NameEn,
                    SortOrder = v.SortOrder
                });
                result.CreatedCount++;
                known[v.Key] = created.Id;
                var kEn = Norm(v.NameEn);
                if (kEn.Length > 0) known.TryAdd(kEn, created.Id);
                if (v.ParentKey != null && v.ParentKey != v.Key) linkJobs.Add((v, created.Id));
            }
            catch (InvalidOperationException ex)
            {
                _context.ChangeTracker.Clear();
                result.FailedCount++;
                AddErrors(new[] { NewError(v.RowNumber, "SAVE_FAILED", value: ex.Message) });
            }
            catch (Exception ex)
            {
                _context.ChangeTracker.Clear();
                _logger.LogError(ex, "Category import failed at row {Row}", v.RowNumber);
                result.FailedCount++;
                AddErrors(new[] { NewError(v.RowNumber, "SAVE_FAILED") });
            }
            finally
            {
                _context.ChangeTracker.Clear();
            }
        }

        // ---- pass 3: link children to their parents ----
        foreach (var job in linkJobs)
        {
            try
            {
                if (!known.TryGetValue(job.Row.ParentKey!, out var parentId))
                {
                    var parent = await _categoryService.CreateAsync(storeId, new CreateCategoryDto
                    {
                        NameAr = job.Row.ParentName!,
                        NameEn = job.Row.ParentName!,
                        SortOrder = 0
                    });
                    parentId = parent.Id;
                    known[job.Row.ParentKey!] = parentId;
                    result.CreatedParents.Add(job.Row.ParentName!);
                    _context.ChangeTracker.Clear();
                }

                if (parentId == job.Id) continue;

                var entity = await _context.Categories
                    .FirstOrDefaultAsync(x => x.Id == job.Id && x.StoreId == storeId);
                if (entity != null)
                {
                    entity.ParentCategoryId = parentId;
                    await _context.SaveChangesAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Category import: could not link row {Row} to its parent", job.Row.RowNumber);
            }
            finally
            {
                _context.ChangeTracker.Clear();
            }
        }

        return result;
    }

    private static ProductImportErrorDto NewError(int row, string code, string? field = null, string? value = null) =>
        new() { Row = row, Code = code, Field = field, Value = value };

    // ============================================================
    // Excel reading
    // ============================================================
    private static List<RawRow> ReadRows(Stream file, out List<string> ignoredColumns)
    {
        ignoredColumns = new List<string>();

        XLWorkbook wb;
        try { wb = new XLWorkbook(file); }
        catch { throw new CategoryImportException("INVALID_FILE"); }

        using (wb)
        {
            var ws = wb.Worksheets.FirstOrDefault();
            if (ws == null) throw new CategoryImportException("NO_ROWS");

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            var lastCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 0, 60);
            if (lastRow == 0 || lastCol == 0) throw new CategoryImportException("NO_ROWS");

            // header row = the row (within the first 10) that recognises the most column names
            var headerRow = 0;
            var colMap = new Dictionary<int, string>();
            var scanTo = Math.Min(lastRow, 10);
            for (var r = 1; r <= scanTo; r++)
            {
                var map = new Dictionary<int, string>();
                var seenKeys = new HashSet<string>();
                for (var c = 1; c <= lastCol; c++)
                {
                    var text = CellText(ws.Cell(r, c));
                    if (text == null) continue;
                    var key = ResolveKey(text);
                    if (key != null && seenKeys.Add(key)) map[c] = key;
                }
                if (map.Count > colMap.Count)
                {
                    headerRow = r;
                    colMap = map;
                }
            }
            if (headerRow == 0) throw new CategoryImportException("HEADERS_NOT_FOUND");

            var keys = colMap.Values.ToHashSet();
            if (!keys.Contains("nameAr") && !keys.Contains("nameEn"))
                throw new CategoryImportException("MISSING_COLUMNS", "name");

            for (var c = 1; c <= lastCol; c++)
            {
                if (colMap.ContainsKey(c)) continue;
                var text = CellText(ws.Cell(headerRow, c));
                if (text != null) ignoredColumns.Add(text);
            }

            var rows = new List<RawRow>();
            for (var r = headerRow + 1; r <= lastRow; r++)
            {
                var cells = new Dictionary<string, string?>();
                foreach (var (col, key) in colMap)
                {
                    var text = CellText(ws.Cell(r, col));
                    if (text != null) cells[key] = text;
                }
                if (cells.Count == 0) continue;

                rows.Add(new RawRow(r, cells));
                if (rows.Count > MaxRows)
                    throw new CategoryImportException("TOO_MANY_ROWS", MaxRows.ToString());
            }

            if (rows.Count == 0) throw new CategoryImportException("NO_ROWS");
            return rows;
        }
    }

    private static string? CellText(IXLCell cell)
    {
        var v = cell.Value;
        if (v.IsBlank) return null;

        string s;
        if (v.IsNumber)
        {
            var d = v.GetNumber();
            s = d == Math.Floor(d) && Math.Abs(d) < 1e15
                ? ((long)d).ToString(CultureInfo.InvariantCulture)
                : d.ToString("0.###############", CultureInfo.InvariantCulture);
        }
        else if (v.IsBoolean)
        {
            s = v.GetBoolean() ? "true" : "false";
        }
        else
        {
            s = v.ToString();
        }

        s = s.Trim();
        return s.Length == 0 ? null : s;
    }

    private static string? ResolveKey(string headerText)
    {
        var candidates = new List<string> { headerText };
        candidates.AddRange(headerText.Split(new[] { '/', '\\', '|', '\n' }, StringSplitOptions.RemoveEmptyEntries));
        foreach (var cand in candidates)
        {
            var n = Norm(cand);
            if (n.Length > 0 && AliasMap.TryGetValue(n, out var key)) return key;
        }
        return null;
    }

    private static Dictionary<string, string> BuildAliasMap()
    {
        var map = new Dictionary<string, string>();
        foreach (var c in Columns)
        {
            foreach (var a in new[] { c.HeaderAr, c.HeaderEn }.Concat(c.Aliases))
            {
                var n = Norm(a);
                if (n.Length > 0) map.TryAdd(n, c.Key);
            }
        }
        return map;
    }

    // ============================================================
    // Text / number helpers
    // ============================================================
    private static string Norm(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var sb = new StringBuilder();
        foreach (var ch in s.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormKC))
        {
            var c = ch;
            if (c == '\u0623' || c == '\u0625' || c == '\u0622' || c == '\u0671') c = '\u0627';
            else if (c == '\u0629') c = '\u0647';
            else if (c == '\u0649' || c == '\u06CC') c = '\u064A';
            else if (c == '\u06A9') c = '\u0643';
            else if (c == '\u0640') continue;
            if (char.IsLetterOrDigit(c)) sb.Append(c);
        }
        return sb.ToString();
    }

    private static string ToAsciiDigits(string s)
    {
        var sb = new StringBuilder(s.Length);
        foreach (var c in s)
        {
            if (c >= '\u0660' && c <= '\u0669') sb.Append((char)('0' + (c - '\u0660')));
            else if (c >= '\u06F0' && c <= '\u06F9') sb.Append((char)('0' + (c - '\u06F0')));
            else if (c == '\u066B') sb.Append('.');
            else if (c == '\u066C' || c == '\u060C') sb.Append(',');
            else sb.Append(c);
        }
        return sb.ToString();
    }

    private static bool TryParseInt(string raw, out int value)
    {
        value = 0;
        if (!TryParseDecimal(raw, out var d)) return false;
        if (d != Math.Floor(d) || d > int.MaxValue || d < int.MinValue) return false;
        value = (int)d;
        return true;
    }

    private static bool TryParseDecimal(string raw, out decimal value)
    {
        value = 0;
        var s = ToAsciiDigits(raw).Replace(" ", "").Replace("\u00A0", "");
        s = Regex.Replace(s, "(sar|\u0631\u064A\u0627\u0644|\u0631\\.\u0633|\uFDFC|\\$)", "", RegexOptions.IgnoreCase);
        if (s.Length == 0) return false;

        var lastComma = s.LastIndexOf(',');
        var lastDot = s.LastIndexOf('.');
        if (lastComma >= 0 && lastDot >= 0)
        {
            s = lastComma > lastDot
                ? s.Replace(".", "").Replace(',', '.')
                : s.Replace(",", "");
        }
        else if (lastComma >= 0)
        {
            s = Regex.IsMatch(s, @"^-?\d{1,3}(,\d{3})+$")
                ? s.Replace(",", "")
                : s.Replace(',', '.');
        }

        return decimal.TryParse(s, NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint,
            CultureInfo.InvariantCulture, out value);
    }

    // ============================================================
    // Template
    // ============================================================
    public byte[] BuildTemplate()
    {
        using var wb = new XLWorkbook();

        var ws = wb.AddWorksheet("التصنيفات - Categories");
        ws.RightToLeft = true;
        ws.Row(1).Height = 36;

        for (var i = 0; i < Columns.Length; i++)
        {
            var col = Columns[i];
            var colNo = i + 1;

            ws.Column(colNo).Width = col.Width;
            if (col.IsText) ws.Column(colNo).Style.NumberFormat.Format = "@";

            var cell = ws.Cell(1, colNo);
            cell.Value = $"{col.HeaderAr} / {col.HeaderEn}";
            cell.Style.Font.Bold = true;
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Fill.BackgroundColor = col.Required ? XLColor.FromHtml("#C2410C") : XLColor.FromHtml("#0B5D7A");
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
            cell.Style.Alignment.Vertical = XLAlignmentVerticalValues.Center;
            cell.Style.Alignment.WrapText = true;
        }
        ws.SheetView.FreezeRows(1);

        var info = wb.AddWorksheet("التعليمات - Instructions");
        info.RightToLeft = true;
        info.Column(1).Width = 34;
        info.Column(2).Width = 14;
        info.Column(3).Width = 90;
        info.Column(4).Width = 34;

        var row = 1;
        info.Cell(row, 1).Value = "تعليمات استيراد التصنيفات / Category import instructions";
        info.Cell(row, 1).Style.Font.Bold = true;
        info.Cell(row, 1).Style.Font.FontSize = 14;
        row += 2;

        foreach (var line in Notes)
        {
            info.Cell(row, 1).Value = line;
            row++;
        }
        row++;

        var heads = new[] { "العمود / Column", "مطلوب / Required", "الوصف / Description", "مثال / Example" };
        for (var i = 0; i < heads.Length; i++)
        {
            var h = info.Cell(row, i + 1);
            h.Value = heads[i];
            h.Style.Font.Bold = true;
            h.Style.Font.FontColor = XLColor.White;
            h.Style.Fill.BackgroundColor = XLColor.FromHtml("#0B5D7A");
        }
        row++;

        foreach (var col in Columns)
        {
            info.Cell(row, 1).Value = $"{col.HeaderAr} / {col.HeaderEn}";
            info.Cell(row, 2).Value = col.Required ? "نعم / Yes" : "لا / No";
            info.Cell(row, 3).Value = col.Desc;
            info.Cell(row, 4).Value = col.Example;
            info.Cell(row, 3).Style.Alignment.WrapText = true;
            row++;
        }

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
