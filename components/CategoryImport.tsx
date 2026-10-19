"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import api from "../lib/api";

type ImportError = {
  row: number;
  code: string;
  field?: string | null;
  value?: string | null;
};

type ImportResult = {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  createdParents: string[];
  ignoredColumns: string[];
  errors: ImportError[];
  errorsTruncated: boolean;
};

type Props = {
  basePath: string;
  onImported?: () => void;
};

const MAX_BYTES = 5 * 1024 * 1024;
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const fill = (text: string, values: Record<string, string>) =>
  Object.keys(values).reduce((acc, k) => acc.split(`{${k}}`).join(values[k]), text);

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const M = {
  ar: {
    button: "استيراد من ملف",
    downloadTemplate: "تنزيل القالب",
    downloading: "جارٍ التنزيل…",
    title: "استيراد التصنيفات من ملف Excel",
    step1: "1) نزّل القالب واملأه: كل صف = تصنيف واحد",
    step2: "2) ارفع الملف المكتمل",
    dropHint: "اسحب ملف ‎.xlsx‎ هنا أو اضغط للاختيار",
    limits: "الحد الأقصى: 500 تصنيف و5 ميجابايت — الملف بصيغة xlsx فقط",
    note: "عمود «التصنيف الأب» للتسلسل: لو اسمه مش موجود يُنشأ تلقائيًا كتصنيف رئيسي، والأسماء الموجودة في المتجر تُتخطى",
    uploading: "جارٍ رفع الملف واستيراد التصنيفات…",
    uploadingShort: "جارٍ الرفع…",
    upload: "ابدأ الاستيراد",
    cancel: "إلغاء",
    close: "إغلاق",
    resultTotal: "صفوف بالملف",
    resultCreated: "تم إنشاؤها",
    resultFailed: "فشلت",
    allSuccess: "✅ تم استيراد كل التصنيفات بنجاح",
    createdParents: "تصنيفات أب تم إنشاؤها تلقائيًا:",
    ignoredColumns: "أعمدة تمت مراجعتها (لم تُستخدم):",
    errorsTitle: "أخطاء بالصفوف",
    colRow: "الصف",
    colField: "العمود",
    colProblem: "المشكلة",
    colValue: "القيمة",
    rowHint: "رقم الصف هو كما يظهر في ملف الإكسل (الصف الأول = 1).",
    errorsTruncated: "تم عرض أول 200 خطأ فقط.",
    done: "تم",
    another: "استيراد ملف آخر",
    fail: {
      GENERIC: "تعذر استيراد الملف — حاول مرة أخرى",
      NETWORK: "تعذر الاتصال بالخادم — تحقق من الإنترنت",
      TIMEOUT: "استغرق الرفع وقتًا طويلًا — جرّب ملف أصغر",
      FORBIDDEN: "ليس لديك صلاحية استيراد التصنيفات",
      MISSING_COLUMNS: "أعمدة ناقصة في الملف: {columns}",
      TOO_MANY_ROWS: "الملف يحتوي على أكتر من {n} صف",
      INVALID_FILE: "تعذر قراءة الملف — تأكد إنه xlsx سليم",
      HEADERS_NOT_FOUND: "لم يتم العثور على عناوين الأعمدة في أول 10 صفوف",
      NO_ROWS: "الملف فارغ أو مفيهوش صفوف بيانات",
      NO_STORE: "لا يوجد متجر مرتبط بحسابك",
      FILE_TOO_LARGE: "حجم الملف أكبر من 5 ميجابايت",
      UNSUPPORTED_FORMAT: "صيغة الملف غير مدعومة — استخدم xlsx فقط",
      NO_FILE: "لم يتم اختيار ملف",
      TEMPLATE: "تعذر تنزيل القالب",
    } as Record<string, string>,
    field: {
      name: "الاسم",
      nameAr: "التصنيف (عربي)",
      nameEn: "التصنيف (إنجليزي)",
      parent: "التصنيف الأب",
      sortOrder: "الترتيب",
    } as Record<string, string>,
    err: {
      MISSING_NAME: "اسم التصنيف مفقود",
      DUPLICATE: "التصنيف موجود بالفعل في المتجر أو مكرر في الملف",
      BAD_SORT: "قيمة الترتيب ليست رقمًا صحيحًا",
      SAVE_FAILED: "تعذر حفظ التصنيف",
    } as Record<string, string>,
  },
  en: {
    button: "Import from file",
    downloadTemplate: "Download template",
    downloading: "Downloading…",
    title: "Import categories from an Excel file",
    step1: "1) Download the template and fill it: one row = one category",
    step2: "2) Upload the completed file",
    dropHint: "Drop an .xlsx file here or click to choose",
    limits: "Maximum: 500 categories and 5 MB — xlsx files only",
    note: "The parent category column is for nesting: when its name does not exist it is auto-created as a top-level category, and existing store names are skipped",
    uploading: "Uploading and importing categories…",
    uploadingShort: "Uploading…",
    upload: "Start import",
    cancel: "Cancel",
    close: "Close",
    resultTotal: "Rows in file",
    resultCreated: "Created",
    resultFailed: "Failed",
    allSuccess: "✅ All categories imported successfully",
    createdParents: "Parent categories created automatically:",
    ignoredColumns: "Columns reviewed (not used):",
    errorsTitle: "Row errors",
    colRow: "Row",
    colField: "Column",
    colProblem: "Problem",
    colValue: "Value",
    rowHint: "The row number is as shown in the Excel file (row 1 = 1).",
    errorsTruncated: "Only the first 200 errors are shown.",
    done: "Done",
    another: "Import another file",
    fail: {
      GENERIC: "Could not import the file — please try again",
      NETWORK: "Could not reach the server — check your internet",
      TIMEOUT: "The upload took too long — try a smaller file",
      FORBIDDEN: "You do not have permission to import categories",
      MISSING_COLUMNS: "Missing columns in the file: {columns}",
      TOO_MANY_ROWS: "The file contains more than {n} rows",
      INVALID_FILE: "Could not read the file — make sure it is a valid xlsx",
      HEADERS_NOT_FOUND: "Column headers were not found in the first 10 rows",
      NO_ROWS: "The file is empty or has no data rows",
      NO_STORE: "No store is linked to your account",
      FILE_TOO_LARGE: "The file is larger than 5 MB",
      UNSUPPORTED_FORMAT: "Unsupported file format — use xlsx only",
      NO_FILE: "No file was selected",
      TEMPLATE: "Could not download the template",
    } as Record<string, string>,
    field: {
      name: "Name",
      nameAr: "Category (AR)",
      nameEn: "Category (EN)",
      parent: "Parent category",
      sortOrder: "Sort order",
    } as Record<string, string>,
    err: {
      MISSING_NAME: "Category name is missing",
      DUPLICATE: "The category already exists in the store or is repeated in the file",
      BAD_SORT: "The sort value is not a whole number",
      SAVE_FAILED: "Could not save the category",
    } as Record<string, string>,
  },
};

export default function CategoryImport({ basePath, onImported }: Props) {
  const { i18n } = useTranslation();
  const en = !!i18n.language?.startsWith("en");
  const L = M[en ? "en" : "ar"];
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [failure, setFailure] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const failText = (code: string, details?: string[]) => {
    const base = L.fail[code] ?? code;
    if (code === "MISSING_COLUMNS") {
      const names = (details ?? []).map((d) => L.field[d] ?? d).join(", ");
      return fill(base, { columns: names });
    }
    if (code === "TOO_MANY_ROWS") return fill(base, { n: details?.[0] ?? "500" });
    return base;
  };

  const resolveFailure = (err: unknown) => {
    const e = err as {
      code?: string;
      response?: {
        status?: number;
        data?: { code?: string; details?: string[]; message?: string };
      };
    };
    const data = e.response?.data;
    const status = e.response?.status;
    if (data?.code) return failText(data.code, data.details);
    if (status === 403 && data?.message) return data.message;
    if (status === 403) return failText("FORBIDDEN");
    if (status === 413) return failText("FILE_TOO_LARGE");
    if (status === 502 || status === 503 || status === 504 || e.code === "ECONNABORTED") {
      return failText("TIMEOUT");
    }
    if (!e.response) return failText("NETWORK");
    return failText("GENERIC");
  };

  const close = () => {
    if (uploading) return;
    setOpen(false);
    setFile(null);
    setResult(null);
    setFailure("");
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const pickFile = (f: File | null) => {
    setFailure("");
    if (!f) {
      setFile(null);
      return;
    }
    if (!f.name.toLowerCase().endsWith(".xlsx")) {
      setFile(null);
      setFailure(failText("UNSUPPORTED_FORMAT"));
      return;
    }
    if (f.size > MAX_BYTES) {
      setFile(null);
      setFailure(failText("FILE_TOO_LARGE"));
      return;
    }
    setFile(f);
  };

  const downloadTemplate = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const res = await api.get(`${basePath}/import/template`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: XLSX_MIME }));
      const a = document.createElement("a");
      a.href = url;
      a.download = "categories-import-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert(failText("TEMPLATE"));
    } finally {
      setDownloading(false);
    }
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setFailure("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`${basePath}/import`, form, { timeout: 600000 });
      const data = res.data?.data as ImportResult | undefined;
      if (!data) {
        setFailure(failText("GENERIC"));
        return;
      }
      setResult(data);
      if (data.createdCount > 0 && onImported) onImported();
    } catch (err) {
      setFailure(resolveFailure(err));
    } finally {
      setUploading(false);
    }
  };

  const resetForAnother = () => {
    setResult(null);
    setFile(null);
    setFailure("");
  };

  const secondaryBtn =
    "inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--blue-deep)] text-[var(--blue-deep)] bg-white hover:bg-gray-50 font-bold text-[13px] transition-colors disabled:opacity-50";

  const formView = (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
        <p className="text-[13px] font-bold text-[var(--ink)] mb-3">{L.step1}</p>
        <button type="button" onClick={downloadTemplate} disabled={downloading} className={secondaryBtn}>
          <span aria-hidden="true">⬇</span>
          {downloading ? L.downloading : L.downloadTemplate}
        </button>
      </div>

      <p className="text-[13px] font-bold text-[var(--ink)] mb-2">{L.step2}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
          dragOver ? "border-[var(--blue-deep)] bg-blue-50" : "border-gray-300 bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={`.xlsx,${XLSX_MIME}`}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            pickFile(f);
            e.target.value = "";
          }}
        />
        {file ? (
          <div>
            <p className="text-[14px] font-bold text-[var(--ink)] break-all">{file.name}</p>
            <p className="text-[12px] text-[var(--sub)] mt-1">{formatSize(file.size)}</p>
          </div>
        ) : (
          <p className="text-[13px] text-[var(--sub)]">{L.dropHint}</p>
        )}
      </div>

      <p className="text-[12px] text-[var(--sub)] mt-2">{L.limits}</p>
      <p className="text-[12px] text-[var(--sub)] mt-1">{L.note}</p>

      {failure && <div className="alert alert--danger mt-4">{failure}</div>}

      {uploading && (
        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 p-3 text-[13px] font-bold">
          {L.uploading}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={upload} disabled={!file || uploading} className="btn btn-primary disabled:opacity-50">
          {uploading ? L.uploadingShort : L.upload}
        </button>
        <button type="button" onClick={close} disabled={uploading} className={secondaryBtn}>
          {L.cancel}
        </button>
      </div>
    </>
  );

  const resultView = result && (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
          <div className="text-[22px] font-bold text-[var(--ink)]">{result.totalRows}</div>
          <div className="text-[12px] text-[var(--sub)]">{L.resultTotal}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
          <div className="text-[22px] font-bold text-green-800">{result.createdCount}</div>
          <div className="text-[12px] text-green-800">{L.resultCreated}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
          <div className="text-[22px] font-bold text-red-800">{result.failedCount}</div>
          <div className="text-[12px] text-red-800">{L.resultFailed}</div>
        </div>
      </div>

      {result.failedCount === 0 && result.createdCount > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 p-3 text-[13px] font-bold mb-4">
          {L.allSuccess}
        </div>
      )}

      {result.createdParents.length > 0 && (
        <div className="mb-4 text-[13px]">
          <p className="font-bold text-[var(--ink)] mb-1">{L.createdParents}</p>
          <p className="text-[var(--sub)]">{result.createdParents.join("، ")}</p>
        </div>
      )}

      {result.ignoredColumns.length > 0 && (
        <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 p-3 text-[13px]">
          <p className="font-bold mb-1">{L.ignoredColumns}</p>
          <p>{result.ignoredColumns.join("، ")}</p>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[14px] font-bold text-[var(--ink)] mb-2">{L.errorsTitle}</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-gray-200">
            <table className="w-full text-[12.5px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-start font-bold">{L.colRow}</th>
                  <th className="px-3 py-2 text-start font-bold">{L.colField}</th>
                  <th className="px-3 py-2 text-start font-bold">{L.colProblem}</th>
                  <th className="px-3 py-2 text-start font-bold">{L.colValue}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, i) => (
                  <tr key={`${e.row}-${e.code}-${i}`} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-bold whitespace-nowrap">{e.row}</td>
                    <td className="px-3 py-2">
                      {e.field ? L.field[e.field] ?? e.field : "—"}
                    </td>
                    <td className="px-3 py-2">{L.err[e.code] ?? e.code}</td>
                    <td className="px-3 py-2 break-all">{e.value ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[var(--sub)] mt-2">{L.rowHint}</p>
          {result.errorsTruncated && (
            <p className="text-[12px] text-[var(--sub)] mt-1">{L.errorsTruncated}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={close} className="btn btn-primary">
          {L.done}
        </button>
        <button type="button" onClick={resetForAnother} className={secondaryBtn}>
          {L.another}
        </button>
      </div>
    </>
  );

  const modal = (
    <div className="modal-overlay" onClick={close}>
      <div
        className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{L.title}</h2>
          <button
            type="button"
            onClick={close}
            disabled={uploading}
            className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors disabled:opacity-40"
            aria-label={L.close}
          >
            ✕
          </button>
        </div>
        {result ? resultView : formView}
      </div>
    </div>
  );

  return (
    <>
      <button type="button" onClick={downloadTemplate} disabled={downloading} className={secondaryBtn}>
        <span aria-hidden="true">⬇</span>
        {L.downloadTemplate}
      </button>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <span aria-hidden="true">⬆</span> {L.button}
      </button>
      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
