using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FatooraRahatak.Application.DTOs.Products;
using FatooraRahatak.Application.Interfaces;
using FatooraRahatak.Infrastructure.Data;

namespace FatooraRahatak.Infrastructure.Services;

public class ProductImportService : IProductImportService
{
    public const int MaxRows = 500;
    private const int MaxErrorsReturned = 200;

    private sealed record ColumnDef(
        string Key, string HeaderAr, string HeaderEn, bool Required, bool IsText,
        double Width, string Example, string Desc, string[] Aliases);

    private sealed record RawRow(int RowNumber, Dictionary<string, string?> Cells);

    private sealed class ParsedRow
    {
        public CreateProductDto Dto { get; set; } = new();
        public string? CategoryAr { get; set; }
        public string? CategoryEn { get; set; }
    }

    private static readonly ColumnDef[] Columns =
    {
        new("category", "التصنيف", "Category", false, false, 22, "إلكترونيات",
            "اسم التصنيف؛ يُربط بالتصنيف الموجود أو يُنشأ تلقائيًا، وفارغ = بدون تصنيف / Category name: matched to an existing category or created automatically; blank = no category",
            new[] { "القسم", "اسم التصنيف", "category name" }),
        new("categoryEn", "التصنيف (إنجليزي)", "Category (EN)", false, false, 22, "Electronics",
            "الاسم الإنجليزي للتصنيف، يُستخدم فقط عند إنشاء تصنيف جديد / English category name, used only when a new category is created",
            new[] { "category english", "category name en" }),
        new("nameAr", "الاسم (عربي)", "Name (AR)", true, false, 30, "سماعة بلوتوث",
            "اسم المنتج بالعربي / Product name in Arabic",
            new[] { "الاسم", "اسم المنتج", "اسم المنتج (عربي)", "name arabic", "arabic name", "product name ar" }),
        new("nameEn", "الاسم (إنجليزي)", "Name (EN)", true, false, 30, "Bluetooth Headphones",
            "اسم المنتج بالإنجليزي / Product name in English",
            new[] { "الاسم (إنكليزي)", "اسم المنتج (إنجليزي)", "name english", "english name", "product name en", "name", "product name" }),
        new("descriptionAr", "الوصف (عربي)", "Description (AR)", false, false, 40, "سماعة لاسلكية بعمر بطارية طويل",
            "وصف المنتج بالعربي / Product description in Arabic",
            new[] { "الوصف", "وصف المنتج", "وصف المنتج (عربي)", "description arabic" }),
        new("descriptionEn", "الوصف (إنجليزي)", "Description (EN)", false, false, 40, "Wireless headphones with long battery life",
            "وصف المنتج بالإنجليزي / Product description in English",
            new[] { "وصف المنتج (إنجليزي)", "description english", "description", "product description" }),
        new("sku", "رمز SKU", "SKU", false, true, 18, "HP-001",
            "رمز المنتج؛ فارغ = يُولَّد تلقائيًا، ويجب ألا يتكرر / Product code; blank = auto-generated, must be unique",
            new[] { "رمز المنتج", "sku code", "product code" }),
        new("barcode", "الباركود", "Barcode", false, true, 20, "6281234567890",
            "باركود المنتج (اختياري) / Product barcode (optional)",
            new[] { "باركود", "barcode number" }),
        new("basePrice", "السعر الأساسي", "Base Price", true, false, 16, "199.99",
            "سعر البيع الأساسي (مطلوب) / Base selling price (required)",
            new[] { "السعر", "سعر البيع", "price", "selling price" }),
        new("discountPrice", "سعر الخصم", "Discount Price", false, false, 16, "149.99",
            "السعر بعد الخصم؛ يجب أن يقل عن السعر الأساسي / Price after discount; must be lower than the base price",
            new[] { "السعر بعد الخصم", "sale price" }),
        new("costPrice", "سعر التكلفة", "Cost Price", false, false, 16, "90",
            "سعر التكلفة؛ الافتراضي 0 / Cost price; default 0",
            new[] { "التكلفة", "cost" }),
        new("weight", "الوزن (كجم)", "Weight (kg)", false, false, 14, "0.35",
            "الوزن بالكيلوجرام (اختياري) / Weight in kilograms (optional)",
            new[] { "الوزن", "weight" }),
        new("hasWarranty", "عليه ضمان", "Has Warranty", false, false, 14, "نعم",
            "نعم أو لا؛ الافتراضي لا / Yes or No; default No",
            new[] { "المنتج عليه ضمان", "ضمان", "warranty" }),
        new("warrantyMonths", "مدة الضمان (بالأشهر)", "Warranty (months)", false, false, 18, "12",
            "عدد أشهر الضمان عند وجود ضمان / Warranty duration in months when the product has a warranty",
            new[] { "مدة الضمان", "مدة الضمان بالأشهر", "مدة الضمان بالشهور", "warranty months", "warranty duration" }),
        new("initialQuantity", "الكمية الابتدائية", "Initial Quantity", false, false, 16, "50",
            "الكمية المتاحة في المخزن الافتراضي؛ الافتراضي 0 / Opening quantity in the default warehouse; default 0",
            new[] { "الكمية", "quantity", "qty", "stock", "المخزون" }),
    };

    private static readonly HashSet<string> YesValues = new() { "نعم", "ايوه", "ايوا", "اجل", "صح", "yes", "y", "true", "1" };
    private static readonly HashSet<string> NoValues = new() { "لا", "كلا", "no", "n", "false", "0", "خطا" };

    private static readonly string[] Notes =
    {
        "1) كل صف = منتج واحد، ولا تغيّر عناوين الأعمدة في الصف الأول / Each row is one product; do not rename the headers in row 1",
        "2) العناوين البرتقالية مطلوبة: يكفي اسم واحد (عربي أو إنجليزي) والثاني يُنسخ تلقائيًا، مع السعر الأساسي / Orange headers are required: at least one name (Arabic or English, the other is copied automatically) plus the base price",
        "3) التصنيف: إن كان موجودًا يُربط به المنتج، وإن لم يكن يُنشأ تلقائيًا / Category: reused if it exists, otherwise created automatically",
        "4) رمز SKU: اتركه فارغًا ليُولَّد تلقائيًا، ولا يمكن تكراره / SKU: leave blank to auto-generate; it must be unique",
        "5) عليه ضمان: نعم أو لا / Has warranty: Yes or No",
        "6) الحد الأقصى 500 منتج و5 ميجابايت للملف الواحد / Maximum 500 products and 5 MB per file",
        "7) الصور تُضاف يدويًا من صفحة المنتجات بعد الاستيراد / Images are added manually from the products page after importing",
    };

    private static readonly Dictionary<string, string> AliasMap = BuildAliasMap();

    private readonly AppDbContext _context;
    private readonly IProductService _productService;
    private readonly ICategoryService _categoryService;
    private readonly ILogger<ProductImportService> _logger;

    public ProductImportService(
        AppDbContext context,
        IProductService productService,
        ICategoryService categoryService,
        ILogger<ProductImportService> logger)
    {
        _context = context;
        _productService = productService;
        _categoryService = categoryService;
        _logger = logger;
    }

    // ============================================================
    // Import
    // ============================================================
    public async Task<ProductImportResultDto> ImportAsync(long storeId, long userId, Stream file)
    {
        var rows = ReadRows(file, out var ignored);
        var result = new ProductImportResultDto { TotalRows = rows.Count, IgnoredColumns = ignored };

        var categories = new Dictionary<string, long>();
        foreach (var c in await _categoryService.GetAllAsync(storeId))
        {
            var kAr = Norm(c.NameAr);
            if (kAr.Length > 0) categories.TryAdd(kAr, c.Id);
            var kEn = Norm(c.NameEn);
            if (kEn.Length > 0) categories.TryAdd(kEn, c.Id);
        }

        var existingSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var dbSkus = await _context.Products.Where(p => p.StoreId == storeId).Select(p => p.Sku).ToListAsync();
        foreach (var s in dbSkus)
            if (!string.IsNullOrEmpty(s)) existingSkus.Add(s);

        var createdSkus = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var limitReached = false;

        void AddErrors(IEnumerable<ProductImportErrorDto> list)
        {
            foreach (var e in list)
            {
                if (result.Errors.Count < MaxErrorsReturned) result.Errors.Add(e);
                else result.ErrorsTruncated = true;
            }
        }

        foreach (var row in rows)
        {
            var rowErrors = new List<ProductImportErrorDto>();
            var parsed = ParseRow(row, rowErrors);

            if (parsed != null && parsed.Dto.Sku != null)
            {
                var sku = parsed.Dto.Sku;
                if (existingSkus.Contains(sku))
                    rowErrors.Add(NewError(row.RowNumber, "SKU_EXISTS", "sku", sku));
                else if (createdSkus.Contains(sku))
                    rowErrors.Add(NewError(row.RowNumber, "SKU_DUPLICATE_IN_FILE", "sku", sku));
            }

            if (parsed == null || rowErrors.Count > 0)
            {
                result.FailedCount++;
                AddErrors(rowErrors);
                continue;
            }

            if (limitReached)
            {
                result.FailedCount++;
                AddErrors(new[] { NewError(row.RowNumber, "PACKAGE_LIMIT") });
                continue;
            }

            try
            {
                var dto = parsed.Dto;
                if (parsed.CategoryAr != null)
                    dto.CategoryId = await ResolveCategoryAsync(storeId, parsed.CategoryAr, parsed.CategoryEn, categories, result);

                await _productService.CreateAsync(storeId, userId, dto);
                result.CreatedCount++;
                if (dto.Sku != null) createdSkus.Add(dto.Sku);
            }
            catch (InvalidOperationException ex)
            {
                _context.ChangeTracker.Clear();
                var code = MapServiceMessage(ex.Message);
                if (code == "PACKAGE_LIMIT") limitReached = true;
                result.FailedCount++;
                AddErrors(new[] { NewError(row.RowNumber, code, value: code == "UNKNOWN" ? ex.Message : null) });
            }
            catch (Exception ex)
            {
                _context.ChangeTracker.Clear();
                _logger.LogError(ex, "Product import failed at row {Row}", row.RowNumber);
                result.FailedCount++;
                AddErrors(new[] { NewError(row.RowNumber, "SAVE_FAILED") });
            }
            finally
            {
                _context.ChangeTracker.Clear();
            }
        }

        return result;
    }

    private async Task<long?> ResolveCategoryAsync(
        long storeId, string nameAr, string? nameEn,
        Dictionary<string, long> cache, ProductImportResultDto result)
    {
        var keyAr = Norm(nameAr);
        var keyEn = string.IsNullOrWhiteSpace(nameEn) ? "" : Norm(nameEn);

        if (keyAr.Length > 0 && cache.TryGetValue(keyAr, out var id)) return id;
        if (keyEn.Length > 0 && cache.TryGetValue(keyEn, out id)) return id;

        var created = await _categoryService.CreateAsync(storeId, new CreateCategoryDto
        {
            NameAr = nameAr,
            NameEn = string.IsNullOrWhiteSpace(nameEn) ? nameAr : nameEn,
            SortOrder = 0
        });

        if (keyAr.Length > 0) cache[keyAr] = created.Id;
        if (keyEn.Length > 0) cache[keyEn] = created.Id;
        result.CreatedCategories.Add(nameAr);
        return created.Id;
    }

    private static string MapServiceMessage(string message)
    {
        if (message.Contains("الحد الأقصى")) return "PACKAGE_LIMIT";
        if (message.Contains("SKU")) return "SKU_EXISTS";
        if (message.Contains("التصنيف")) return "CATEGORY_NOT_FOUND";
        return "UNKNOWN";
    }

    private static ProductImportErrorDto NewError(int row, string code, string? field = null, string? value = null) =>
        new() { Row = row, Code = code, Field = field, Value = value };

    // ============================================================
    // Row validation
    // ============================================================
    private static ParsedRow? ParseRow(RawRow row, List<ProductImportErrorDto> errs)
    {
        var before = errs.Count;

        string? Get(string key) => row.Cells.TryGetValue(key, out var v) ? v : null;
        void Err(string code, string? field = null, string? value = null) =>
            errs.Add(NewError(row.RowNumber, code, field, value));

        decimal? ReadDecimal(string key, decimal max)
        {
            var raw = Get(key);
            if (raw == null) return null;
            if (!TryParseDecimal(raw, out var d) || d > max)
            {
                Err("INVALID_NUMBER", key, raw);
                return null;
            }
            if (d < 0)
            {
                Err("NEGATIVE_NUMBER", key, raw);
                return null;
            }
            return d;
        }

        var nameAr = Get("nameAr");
        var nameEn = Get("nameEn");
        if (nameAr == null && nameEn == null) Err("NAME_REQUIRED");
        nameAr ??= nameEn;
        nameEn ??= nameAr;

        decimal basePrice = 0;
        var basePriceOk = false;
        if (Get("basePrice") == null)
        {
            Err("PRICE_REQUIRED", "basePrice");
        }
        else
        {
            var bp = ReadDecimal("basePrice", 1_000_000_000m);
            if (bp.HasValue)
            {
                basePrice = Math.Round(bp.Value, 2, MidpointRounding.AwayFromZero);
                basePriceOk = true;
            }
        }

        var discount = ReadDecimal("discountPrice", 1_000_000_000m);
        if (discount == 0) discount = null;
        if (discount.HasValue)
        {
            discount = Math.Round(discount.Value, 2, MidpointRounding.AwayFromZero);
            if (basePriceOk && discount.Value >= basePrice)
                Err("DISCOUNT_TOO_HIGH", "discountPrice", Get("discountPrice"));
        }

        var cost = ReadDecimal("costPrice", 1_000_000_000m) ?? 0;
        cost = Math.Round(cost, 2, MidpointRounding.AwayFromZero);

        var weight = ReadDecimal("weight", 100_000m);
        if (weight == 0) weight = null;
        if (weight.HasValue) weight = Math.Round(weight.Value, 3, MidpointRounding.AwayFromZero);

        var qty = 0;
        var qRaw = Get("initialQuantity");
        if (qRaw != null)
        {
            if (!TryParseDecimal(qRaw, out var q) || q != Math.Floor(q) || q > 1_000_000)
                Err("INVALID_INTEGER", "initialQuantity", qRaw);
            else if (q < 0)
                Err("NEGATIVE_NUMBER", "initialQuantity", qRaw);
            else
                qty = (int)q;
        }

        var hasWarranty = false;
        var wRaw = Get("hasWarranty");
        if (wRaw != null)
        {
            var n = Norm(wRaw);
            if (YesValues.Contains(n)) hasWarranty = true;
            else if (NoValues.Contains(n)) hasWarranty = false;
            else Err("INVALID_BOOLEAN", "hasWarranty", wRaw);
        }

        int? months = null;
        var mRaw = Get("warrantyMonths");
        if (mRaw != null)
        {
            if (!TryParseDecimal(mRaw, out var m) || m != Math.Floor(m) || m < 0 || m > 600)
            {
                Err("INVALID_INTEGER", "warrantyMonths", mRaw);
            }
            else if (m > 0)
            {
                months = (int)m;
                if (wRaw == null) hasWarranty = true;
            }
        }
        if (!hasWarranty) months = null;

        if (errs.Count > before) return null;

        return new ParsedRow
        {
            CategoryAr = Get("category") ?? Get("categoryEn"),
            CategoryEn = Get("categoryEn") ?? Get("category"),
            Dto = new CreateProductDto
            {
                NameAr = nameAr ?? string.Empty,
                NameEn = nameEn ?? string.Empty,
                DescriptionAr = Get("descriptionAr"),
                DescriptionEn = Get("descriptionEn"),
                Sku = Get("sku"),
                Barcode = Get("barcode"),
                BasePrice = basePrice,
                DiscountPrice = discount,
                CostPrice = cost,
                Weight = weight,
                InitialQuantity = qty,
                HasWarranty = hasWarranty,
                WarrantyMonths = months
            }
        };
    }

    // ============================================================
    // Excel reading
    // ============================================================
    private static List<RawRow> ReadRows(Stream file, out List<string> ignoredColumns)
    {
        ignoredColumns = new List<string>();

        XLWorkbook wb;
        try { wb = new XLWorkbook(file); }
        catch { throw new ProductImportException("INVALID_FILE"); }

        using (wb)
        {
            var ws = wb.Worksheets.FirstOrDefault();
            if (ws == null) throw new ProductImportException("NO_ROWS");

            var lastRow = ws.LastRowUsed()?.RowNumber() ?? 0;
            var lastCol = Math.Min(ws.LastColumnUsed()?.ColumnNumber() ?? 0, 60);
            if (lastRow == 0 || lastCol == 0) throw new ProductImportException("NO_ROWS");

            var headerRow = 0;
            var colMap = new Dictionary<int, string>();
            var scanTo = Math.Min(lastRow, 10);
            for (var r = 1; r <= scanTo && headerRow == 0; r++)
            {
                var map = new Dictionary<int, string>();
                var seen = new HashSet<string>();
                for (var c = 1; c <= lastCol; c++)
                {
                    var text = CellText(ws.Cell(r, c));
                    if (text == null) continue;
                    var key = ResolveKey(text);
                    if (key != null && seen.Add(key)) map[c] = key;
                }
                if (map.Count >= 2)
                {
                    headerRow = r;
                    colMap = map;
                }
            }
            if (headerRow == 0) throw new ProductImportException("HEADERS_NOT_FOUND");

            var keys = colMap.Values.ToHashSet();
            var missing = new List<string>();
            if (!keys.Contains("nameAr") && !keys.Contains("nameEn")) missing.Add("name");
            if (!keys.Contains("basePrice")) missing.Add("basePrice");
            if (missing.Count > 0) throw new ProductImportException("MISSING_COLUMNS", missing.ToArray());

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
                    throw new ProductImportException("TOO_MANY_ROWS", MaxRows.ToString());
            }

            if (rows.Count == 0) throw new ProductImportException("NO_ROWS");
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

        var ws = wb.AddWorksheet("المنتجات - Products");
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
        info.Cell(row, 1).Value = "تعليمات الاستيراد / Import instructions";
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

    // ---------- URL import: scrape a product page ----------

    private const int MaxHtmlChars = 2_500_000;
    private const long MaxImageBytes = 3 * 1024 * 1024;
    private const int MaxImportImages = 8;

    private static readonly HttpClient UrlImportHttp = CreateUrlImportClient();

    private static readonly Regex LdJsonRegex = new(
        "<script[^>]*type\\s*=\\s*[\"']application/ld\\+json[\"'][^>]*>(.*?)</script>",
        RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex PriceRegex = new(
        "\\d{1,3}(?:[\\s,.]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?",
        RegexOptions.Compiled);

    private static HttpClient CreateUrlImportClient()
    {
        var handler = new SocketsHttpHandler
        {
            AllowAutoRedirect = true,
            AutomaticDecompression = DecompressionMethods.All,
            ConnectCallback = async (context, ct) =>
            {
                var addresses = await Dns.GetHostAddressesAsync(context.DnsEndPoint.Host, ct);
                var allowed = addresses.Where(a => !IsBlockedAddress(a)).ToArray();
                if (allowed.Length == 0)
                    throw new HttpRequestException("Blocked host address");
                var socket = new Socket(SocketType.Stream, ProtocolType.Tcp) { NoDelay = true };
                try
                {
                    await socket.ConnectAsync(allowed, context.DnsEndPoint.Port, ct);
                    return new NetworkStream(socket, ownsSocket: true);
                }
                catch
                {
                    socket.Dispose();
                    throw;
                }
            },
        };
        return new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(30) };
    }

    private static bool IsBlockedAddress(IPAddress ip)
    {
        if (IPAddress.IsLoopback(ip)) return true;
        if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6UniqueLocal) return true;
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();
        if (ip.AddressFamily != AddressFamily.InterNetwork) return false;
        var b = ip.GetAddressBytes();
        return b[0] == 10
            || b[0] == 0
            || (b[0] == 100 && b[1] >= 64 && b[1] <= 127)
            || (b[0] == 172 && b[1] >= 16 && b[1] <= 31)
            || (b[0] == 192 && b[1] == 168)
            || (b[0] == 169 && b[1] == 254);
    }

    public async Task<ProductUrlImportDto> PreviewUrlImportAsync(string url, CancellationToken ct = default)
    {
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || (!uri.IsDefaultPort && uri.Port != 80 && uri.Port != 443))
        {
            throw new ProductImportException("URL_INVALID");
        }

        string html;
        try
        {
            using var req = new HttpRequestMessage(HttpMethod.Get, uri);
            req.Version = HttpVersion.Version20;
            req.VersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
            req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; FatooraRahatak-ProductImport/1.0)");
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/html"));
            req.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/xhtml+xml"));
            req.Headers.AcceptLanguage.ParseAdd("en-US,en;q=0.9");
            using var resp = await UrlImportHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
            resp.EnsureSuccessStatusCode();
            var mediaType = resp.Content.Headers.ContentType?.MediaType ?? "";
            if (mediaType.Length > 0 && !mediaType.Contains("html", StringComparison.OrdinalIgnoreCase))
                throw new ProductImportException("NOT_A_PRODUCT_PAGE");
            await using var stream = await resp.Content.ReadAsStreamAsync(ct);
            using var reader = new StreamReader(stream);
            var buffer = new char[MaxHtmlChars];
            var read = await reader.ReadBlockAsync(buffer.AsMemory(0, MaxHtmlChars), ct);
            html = new string(buffer, 0, read);
        }
        catch (ProductImportException) { throw; }
        catch (OperationCanceledException) { throw new ProductImportException("TIMEOUT"); }
        catch { throw new ProductImportException("FETCH_FAILED"); }

        var (dto, foundProduct) = ExtractUrlProductData(html, uri);
        if (uri.Host.Contains("amazon.", StringComparison.OrdinalIgnoreCase))
            ApplyAmazonFallback(html, uri, dto);
        if (!foundProduct && dto.BasePrice == null && dto.DiscountPrice == null)
        {
            var title = ReadTitleTag(html);
            _logger.LogWarning("URL import: no product data. host={Host} htmlChars={Len} botCheck={Bot} title={Title}",
                uri.Host, html.Length, IsBotCheckPage(html), title == null ? "" : title.Length > 160 ? title[..160] : title);
            if (IsBotCheckPage(html))
                throw new ProductImportException("BOT_BLOCKED");
            throw new ProductImportException("NOT_A_PRODUCT_PAGE");
        }

        dto.Images = await DownloadImagesAsync(dto.Images, ct);
        dto.Name = string.IsNullOrWhiteSpace(dto.Name) ? null : WebUtility.HtmlDecode(dto.Name).Trim();
        dto.Sku = string.IsNullOrWhiteSpace(dto.Sku) ? null : dto.Sku.Trim();
        return dto;
    }

    private static (ProductUrlImportDto Dto, bool FoundProduct) ExtractUrlProductData(string html, Uri baseUri)
    {
        var dto = new ProductUrlImportDto { SourceDomain = baseUri.Host };
        var images = new List<string>();
        var prices = new List<decimal>();
        decimal? highPrice = null;
        string? currency = null;
        var foundProduct = false;

        foreach (var node in FindJsonLdProductNodes(html))
        {
            foundProduct = true;
            dto.Name ??= FirstString(node, "name");
            dto.Description ??= FirstString(node, "description");
            dto.Sku ??= FirstString(node, "sku");
            dto.Category ??= FirstString(node, "category");
            CollectImageValues(node, "image", images);

            if (node.TryGetProperty("offers", out var offersEl))
            {
                foreach (var offer in AsElements(offersEl))
                {
                    if (offer.ValueKind != JsonValueKind.Object) continue;
                    var price = NumberValue(offer, "price") ?? NumberValue(offer, "lowPrice");
                    var high = NumberValue(offer, "highPrice");
                    if (price.HasValue) prices.Add(price.Value);
                    if (high.HasValue) highPrice = high;
                    currency ??= FirstString(offer, "priceCurrency");
                }
            }
        }

        var meta = ReadMetaTags(html);
        string? Meta(string key) => meta.TryGetValue(key, out var v) ? v : null;

        dto.Name ??= Meta("og:title") ?? Meta("twitter:title") ?? ReadTitleTag(html);
        dto.Description ??= Meta("og:description") ?? Meta("description") ?? Meta("twitter:description");
        currency ??= Meta("product:price:currency") ?? Meta("price:currency");
        var metaPrice = ParsePrice(Meta("product:price:amount") ?? Meta("price:amount"));
        if (metaPrice.HasValue) prices.Add(metaPrice.Value);
        AddImageCandidate(Meta("og:image"), images);
        AddImageCandidate(Meta("og:image:url"), images);
        AddImageCandidate(Meta("twitter:image"), images);

        if (prices.Count > 0)
        {
            var min = prices.Min();
            var max = prices.Max();
            if (highPrice.HasValue && highPrice.Value > min)
            {
                dto.BasePrice = highPrice.Value;
                dto.DiscountPrice = min;
            }
            else
            {
                dto.BasePrice = max;
                if (min < max) dto.DiscountPrice = min;
            }
        }

        dto.Currency = currency;
        dto.Description = CleanDescription(dto.Description);
        dto.Images = ResolveImageUrls(images, baseUri).ToList();
        return (dto, foundProduct);
    }

    private static IEnumerable<JsonElement> FindJsonLdProductNodes(string html)
    {
        foreach (Match m in LdJsonRegex.Matches(html))
        {
            JsonDocument doc;
            try { doc = JsonDocument.Parse(WebUtility.HtmlDecode(m.Groups[1].Value)); }
            catch { continue; }

            using (doc)
            {
                foreach (var node in EnumerateJsonNodes(doc.RootElement))
                {
                    if (IsProductNode(node))
                        yield return node.Clone();
                }
            }
        }
    }

    private static IEnumerable<JsonElement> EnumerateJsonNodes(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray()) yield return item;
            yield break;
        }
        if (root.ValueKind != JsonValueKind.Object) yield break;
        if (root.TryGetProperty("@graph", out var graph) && graph.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in graph.EnumerateArray()) yield return item;
            yield break;
        }
        yield return root;
    }

    private static bool IsProductNode(JsonElement node)
    {
        if (node.ValueKind != JsonValueKind.Object || !node.TryGetProperty("@type", out var t))
            return false;
        if (t.ValueKind == JsonValueKind.String)
            return t.GetString()?.Contains("Product", StringComparison.OrdinalIgnoreCase) == true;
        if (t.ValueKind == JsonValueKind.Array)
        {
            foreach (var x in t.EnumerateArray())
            {
                if (x.ValueKind == JsonValueKind.String && x.GetString()?.Contains("Product", StringComparison.OrdinalIgnoreCase) == true)
                    return true;
            }
        }
        return false;
    }

    private static IEnumerable<JsonElement> AsElements(JsonElement el)
    {
        if (el.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in el.EnumerateArray()) yield return item;
        }
        else
        {
            yield return el;
        }
    }

    private static string? FirstString(JsonElement obj, string prop)
    {
        if (obj.ValueKind != JsonValueKind.Object || !obj.TryGetProperty(prop, out var v))
            return null;
        return ElementAsString(v);
    }

    private static string? ElementAsString(JsonElement v)
    {
        switch (v.ValueKind)
        {
            case JsonValueKind.String:
                return v.GetString();
            case JsonValueKind.Number:
                return v.GetRawText();
            case JsonValueKind.Array:
                foreach (var item in v.EnumerateArray())
                {
                    var s = ElementAsString(item);
                    if (!string.IsNullOrWhiteSpace(s)) return s;
                }
                return null;
            case JsonValueKind.Object:
                foreach (var p in new[] { "name", "url", "contentUrl" })
                {
                    if (v.TryGetProperty(p, out var inner) && inner.ValueKind == JsonValueKind.String)
                        return inner.GetString();
                }
                return null;
            default:
                return null;
        }
    }

    private static decimal? NumberValue(JsonElement obj, string prop)
    {
        if (obj.ValueKind != JsonValueKind.Object || !obj.TryGetProperty(prop, out var v))
            return null;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetDecimal(out var d)) return d;
        if (v.ValueKind == JsonValueKind.String) return ParsePrice(v.GetString());
        return null;
    }

    private static void CollectImageValues(JsonElement v, string prop, List<string> into)
    {
        if (v.ValueKind != JsonValueKind.Object || !v.TryGetProperty(prop, out var img)) return;
        CollectImageValues(img, into);
    }

    private static void CollectImageValues(JsonElement v, List<string> into)
    {
        switch (v.ValueKind)
        {
            case JsonValueKind.String:
                AddImageCandidate(v.GetString(), into);
                break;
            case JsonValueKind.Array:
                foreach (var item in v.EnumerateArray()) CollectImageValues(item, into);
                break;
            case JsonValueKind.Object:
                foreach (var p in new[] { "url", "contentUrl", "thumbnailUrl" })
                {
                    if (v.TryGetProperty(p, out var inner)) CollectImageValues(inner, into);
                }
                break;
        }
    }

    private static void AddImageCandidate(string? raw, List<string> into)
    {
        if (string.IsNullOrWhiteSpace(raw) || into.Count >= MaxImportImages * 3) return;
        var s = raw.Trim();
        if (s.StartsWith("data:", StringComparison.OrdinalIgnoreCase)) return;
        into.Add(s);
    }

    private static IEnumerable<string> ResolveImageUrls(IEnumerable<string> raws, Uri baseUri)
    {
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var raw in raws)
        {
            if (!Uri.TryCreate(baseUri, raw, out var u)) continue;
            if (u.Scheme != Uri.UriSchemeHttp && u.Scheme != Uri.UriSchemeHttps) continue;
            if (!u.IsDefaultPort && u.Port != 80 && u.Port != 443) continue;
            if (Path.GetExtension(u.AbsolutePath).Equals(".svg", StringComparison.OrdinalIgnoreCase)) continue;
            if (seen.Add(u.AbsoluteUri)) yield return u.AbsoluteUri;
        }
    }

    private static Dictionary<string, string> ReadMetaTags(string html)
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (Match m in Regex.Matches(html, "<meta\\b[^>]*>", RegexOptions.IgnoreCase))
        {
            var tag = m.Value;
            var key = MetaAttr(tag, "property") ?? MetaAttr(tag, "name");
            var content = MetaAttr(tag, "content");
            if (key == null || content == null) continue;
            map.TryAdd(key.Trim().ToLowerInvariant(), WebUtility.HtmlDecode(content).Trim());
        }
        return map;
    }

    private static string? MetaAttr(string tag, string attr)
    {
        var m = Regex.Match(tag, attr + "\\s*=\\s*[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.Trim() : null;
    }

    private static string? ReadTitleTag(string html)
    {
        var m = Regex.Match(html, "<title[^>]*>(.*?)</title>", RegexOptions.Singleline | RegexOptions.IgnoreCase);
        return m.Success ? WebUtility.HtmlDecode(m.Groups[1].Value).Trim() : null;
    }

    private static decimal? ParsePrice(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var sb = new StringBuilder(raw.Length);
        foreach (var ch in raw)
        {
            if (ch >= '\u0660' && ch <= '\u0669') sb.Append((char)('0' + (ch - '\u0660')));
            else if (ch >= '\u06F0' && ch <= '\u06F9') sb.Append((char)('0' + (ch - '\u06F0')));
            else sb.Append(ch);
        }

        var m = PriceRegex.Match(sb.ToString());
        if (!m.Success) return null;
        var s = m.Value.Replace(" ", "");
        var lastDot = s.LastIndexOf('.');
        var lastComma = s.LastIndexOf(',');
        if (lastDot >= 0 && lastComma >= 0)
        {
            var decSep = lastDot > lastComma ? '.' : ',';
            var thouSep = decSep == '.' ? ',' : '.';
            s = s.Replace(thouSep.ToString(), "").Replace(decSep, '.');
        }
        else if (lastComma >= 0)
        {
            s = (s.Length - lastComma - 1) == 3 ? s.Replace(",", "") : s.Replace(',', '.');
        }
        else if (lastDot >= 0 && (s.Length - lastDot - 1) == 3 && s.Length > 4)
        {
            s = s.Replace(".", "");
        }

        return decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) && d > 0 ? d : null;
    }

    private static string? CleanDescription(string? html)
    {
        if (string.IsNullOrWhiteSpace(html)) return null;
        var s = Regex.Replace(html, "<(script|style)[^>]*>.*?</\\1>", " ", RegexOptions.Singleline | RegexOptions.IgnoreCase);
        s = Regex.Replace(s, "<(?:br\\s*/?|/p|/div|/li|/h[1-6])[^>]*>", "\n", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, "<li[^>]*>", "\n- ", RegexOptions.IgnoreCase);
        s = Regex.Replace(s, "<[^>]+>", " ");
        s = WebUtility.HtmlDecode(s);
        s = Regex.Replace(s, "[ \\t\\u00A0]+", " ");
        s = Regex.Replace(s, "\\s*\\n\\s*", "\n");
        s = Regex.Replace(s, "\\n{3,}", "\n\n").Trim();
        return s.Length == 0 ? null : (s.Length > 8000 ? s[..8000].TrimEnd() : s);
    }

    private async Task<List<string>> DownloadImagesAsync(List<string> urls, CancellationToken ct)
    {
        var saved = new List<string>();
        var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        Directory.CreateDirectory(uploadsDir);

        foreach (var raw in urls)
        {
            if (saved.Count >= MaxImportImages) break;
            try
            {
                using var req = new HttpRequestMessage(HttpMethod.Get, raw);
                req.Headers.UserAgent.ParseAdd("Mozilla/5.0 (compatible; FatooraRahatak-ProductImport/1.0)");
                using var resp = await UrlImportHttp.SendAsync(req, HttpCompletionOption.ResponseHeadersRead, ct);
                if (!resp.IsSuccessStatusCode) continue;
                var ext = ExtFromMime(resp.Content.Headers.ContentType?.MediaType ?? "");
                if (ext == null) continue;
                if (resp.Content.Headers.ContentLength > MaxImageBytes) continue;

                await using var stream = await resp.Content.ReadAsStreamAsync(ct);
                using var ms = new MemoryStream();
                var buffer = new byte[81920];
                long total = 0;
                var tooBig = false;
                int read;
                while ((read = await stream.ReadAsync(buffer.AsMemory(0, buffer.Length), ct)) > 0)
                {
                    total += read;
                    if (total > MaxImageBytes) { tooBig = true; break; }
                    ms.Write(buffer, 0, read);
                }
                if (tooBig || ms.Length == 0) continue;

                var fileName = $"{Guid.NewGuid():N}{ext}";
                await File.WriteAllBytesAsync(Path.Combine(uploadsDir, fileName), ms.ToArray(), ct);
                saved.Add($"/uploads/{fileName}");
            }
            catch
            {
                // صور معطلة بتتخطى والاستيراد يكمل
            }
        }

        return saved;
    }

    private static string? ExtFromMime(string mime) => mime.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/gif" => ".gif",
        _ => null,
    };

    // صفحات أمازون مفيهاش JSON-LD أو og:tags — البيانات جوه عناصر HTML مباشرة
    private static void ApplyAmazonFallback(string html, Uri uri, ProductUrlImportDto dto)
    {
        dto.Name ??= TagInnerText(html, "productTitle");

        if (dto.BasePrice == null)
        {
            var off = Regex.Match(html, "<span[^>]*class=\"[^\"]*a-offscreen[^\"]*\"[^>]*>([^<]+)</span>", RegexOptions.IgnoreCase);
            if (off.Success)
            {
                var raw = WebUtility.HtmlDecode(off.Groups[1].Value);
                dto.BasePrice = ParsePrice(raw);
                dto.Currency ??= IsoCurrencyFromText(raw);
            }
        }

        if (dto.Images.Count == 0)
        {
            var candidates = new List<string>();
            foreach (Match m in Regex.Matches(html, "\"(?:hiRes|large)\":\"(https://m\\.media-amazon\\.com/[^\"]+)\"", RegexOptions.IgnoreCase))
                candidates.Add(m.Groups[1].Value);
            if (candidates.Count == 0)
            {
                var legacy = Regex.Match(html, "data-old-hires=\"(https://[^\"]+)\"", RegexOptions.IgnoreCase);
                if (legacy.Success) candidates.Add(legacy.Groups[1].Value);
            }
            foreach (var u in ResolveImageUrls(candidates, uri))
            {
                if (!dto.Images.Contains(u, StringComparer.OrdinalIgnoreCase))
                    dto.Images.Add(u);
            }
        }

        if (string.IsNullOrWhiteSpace(dto.Description))
        {
            var bullets = Regex.Match(html, "id=\"feature-bullets\"(.*?)</ul>", RegexOptions.Singleline | RegexOptions.IgnoreCase);
            if (bullets.Success)
            {
                var items = new List<string>();
                foreach (Match m in Regex.Matches(bullets.Groups[1].Value, "<span[^>]*class=\"[^\"]*a-list-item[^\"]*\"[^>]*>(.*?)</span>", RegexOptions.Singleline | RegexOptions.IgnoreCase))
                {
                    var txt = CleanDescription(m.Groups[1].Value);
                    if (!string.IsNullOrWhiteSpace(txt)) items.Add(txt);
                }
                if (items.Count > 0) dto.Description = string.Join("\n", items);
            }
        }

        dto.Sku ??= ExtractAsin(uri.AbsolutePath);
    }

    private static string? ExtractAsin(string path)
    {
        var m = Regex.Match(path, "/(?:dp|gp/product)/([A-Z0-9]{10})", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.ToUpperInvariant() : null;
    }

    private static string? TagInnerText(string html, string id)
    {
        var m = Regex.Match(html, $"id=\"{Regex.Escape(id)}\"[^>]*>([^<]+)<", RegexOptions.IgnoreCase);
        return m.Success ? WebUtility.HtmlDecode(m.Groups[1].Value).Trim() : null;
    }

    private static string? IsoCurrencyFromText(string text)
    {
        var m = Regex.Match(text, @"\b(USD|EGP|SAR|AED|EUR|GBP|KWD|QAR|BHD|OMR|JOD|TRY|MAD|DZD|TND)\b", RegexOptions.IgnoreCase);
        return m.Success ? m.Groups[1].Value.ToUpperInvariant() : null;
    }

    private static bool IsBotCheckPage(string html) =>
        html.Contains("make sure you're not a robot", StringComparison.OrdinalIgnoreCase)
        || html.Contains("enter the characters you see below", StringComparison.OrdinalIgnoreCase)
        || html.Contains("pardon our interruption", StringComparison.OrdinalIgnoreCase)
        || html.Contains("automated access to amazon data", StringComparison.OrdinalIgnoreCase)
        || html.Contains("validatecaptcha", StringComparison.OrdinalIgnoreCase)
        || html.Contains("التأكد من أنك لست", StringComparison.OrdinalIgnoreCase)
        || html.Contains("لست روبوتا", StringComparison.OrdinalIgnoreCase)
        || html.Contains("الحروف التي تظهر", StringComparison.OrdinalIgnoreCase);
}
