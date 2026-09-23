"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../lib/api";

type TFn = (key: string) => string;

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
  createdCategories: string[];
  ignoredColumns: string[];
  errors: ImportError[];
  errorsTruncated: boolean;
};

type Props = {
  basePath: string;
  t: TFn;
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

export default function ProductImport({ basePath, t, onImported }: Props) {
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

  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v && v !== key ? v : fallback;
    },
    [t]
  );

  const failText = useCallback(
    (code: string, details?: string[]) => {
      const base = tr(`product.import.fail.${code}`, tr("product.import.fail.GENERIC", code));
      if (code === "MISSING_COLUMNS") {
        const names = (details ?? []).map((d) => tr(`product.import.field.${d}`, d)).join(", ");
        return fill(base, { columns: names });
      }
      if (code === "TOO_MANY_ROWS") return fill(base, { n: details?.[0] ?? "500" });
      return base;
    },
    [tr]
  );

  const resolveFailure = useCallback(
    (err: unknown) => {
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
    },
    [failText]
  );

  const close = useCallback(() => {
    if (uploading) return;
    setOpen(false);
    setFile(null);
    setResult(null);
    setFailure("");
  }, [uploading]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

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
      a.download = "products-import-template.xlsx";
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
        <p className="text-[13px] font-bold text-[var(--ink)] mb-3">{t("product.import.step1")}</p>
        <button type="button" onClick={downloadTemplate} disabled={downloading} className={secondaryBtn}>
          <span aria-hidden="true">⬇</span>
          {downloading ? t("product.import.downloading") : t("product.import.downloadTemplate")}
        </button>
      </div>

      <p className="text-[13px] font-bold text-[var(--ink)] mb-2">{t("product.import.step2")}</p>
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
          <p className="text-[13px] text-[var(--sub)]">{t("product.import.dropHint")}</p>
        )}
      </div>

      <p className="text-[12px] text-[var(--sub)] mt-2">{t("product.import.limits")}</p>
      <p className="text-[12px] text-[var(--sub)] mt-1">{t("product.import.imagesNote")}</p>

      {failure && <div className="alert alert--danger mt-4">{failure}</div>}

      {uploading && (
        <div className="mt-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 p-3 text-[13px] font-bold">
          {t("product.import.uploading")}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={upload} disabled={!file || uploading} className="btn btn-primary disabled:opacity-50">
          {uploading ? t("product.import.uploadingShort") : t("product.import.upload")}
        </button>
        <button type="button" onClick={close} disabled={uploading} className={secondaryBtn}>
          {t("product.import.cancel")}
        </button>
      </div>
    </>
  );

  const resultView = result && (
    <>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-center">
          <div className="text-[22px] font-bold text-[var(--ink)]">{result.totalRows}</div>
          <div className="text-[12px] text-[var(--sub)]">{t("product.import.resultTotal")}</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center">
          <div className="text-[22px] font-bold text-green-800">{result.createdCount}</div>
          <div className="text-[12px] text-green-800">{t("product.import.resultCreated")}</div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
          <div className="text-[22px] font-bold text-red-800">{result.failedCount}</div>
          <div className="text-[12px] text-red-800">{t("product.import.resultFailed")}</div>
        </div>
      </div>

      {result.failedCount === 0 && result.createdCount > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 text-green-800 p-3 text-[13px] font-bold mb-4">
          {t("product.import.allSuccess")}
        </div>
      )}

      {result.createdCategories.length > 0 && (
        <div className="mb-4 text-[13px]">
          <p className="font-bold text-[var(--ink)] mb-1">{t("product.import.newCategories")}</p>
          <p className="text-[var(--sub)]">{result.createdCategories.join("، ")}</p>
        </div>
      )}

      {result.ignoredColumns.length > 0 && (
        <div className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-900 p-3 text-[13px]">
          <p className="font-bold mb-1">{t("product.import.ignoredColumns")}</p>
          <p>{result.ignoredColumns.join("، ")}</p>
        </div>
      )}

      {result.errors.length > 0 && (
        <div className="mb-4">
          <h3 className="text-[14px] font-bold text-[var(--ink)] mb-2">{t("product.import.errorsTitle")}</h3>
          <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-gray-200">
            <table className="w-full text-[12.5px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-start font-bold">{t("product.import.colRow")}</th>
                  <th className="px-3 py-2 text-start font-bold">{t("product.import.colField")}</th>
                  <th className="px-3 py-2 text-start font-bold">{t("product.import.colProblem")}</th>
                  <th className="px-3 py-2 text-start font-bold">{t("product.import.colValue")}</th>
                </tr>
              </thead>
              <tbody>
                {result.errors.map((e, i) => (
                  <tr key={`${e.row}-${e.code}-${i}`} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-bold whitespace-nowrap">{e.row}</td>
                    <td className="px-3 py-2">
                      {e.field ? tr(`product.import.field.${e.field}`, e.field) : "—"}
                    </td>
                    <td className="px-3 py-2">{tr(`product.import.err.${e.code}`, e.code)}</td>
                    <td className="px-3 py-2 break-all">{e.value ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-[var(--sub)] mt-2">{t("product.import.rowHint")}</p>
          {result.errorsTruncated && (
            <p className="text-[12px] text-[var(--sub)] mt-1">{t("product.import.errorsTruncated")}</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-5">
        <button type="button" onClick={close} className="btn btn-primary">
          {t("product.import.done")}
        </button>
        <button type="button" onClick={resetForAnother} className={secondaryBtn}>
          {t("product.import.another")}
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
          <h2 className="text-[18px] font-bold text-[var(--blue-deep)]">{t("product.import.title")}</h2>
          <button
            type="button"
            onClick={close}
            disabled={uploading}
            className="text-[var(--sub)] hover:text-[var(--ink)] transition-colors disabled:opacity-40"
            aria-label={t("common.close")}
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
        {t("product.import.downloadTemplate")}
      </button>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary">
        <span aria-hidden="true">⬆</span> {t("product.import.button")}
      </button>
      {open && mounted ? createPortal(modal, document.body) : null}
    </>
  );
}
