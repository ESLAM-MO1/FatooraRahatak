"use client";

import { useTranslation } from "react-i18next";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, totalCount, pageSize, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-[var(--border)] text-sm">
      <p className="text-[var(--sub)] text-[12.5px]">
        {t("pagination.showing", { from, to, total: totalCount })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="min-w-[34px] h-[34px] px-2 rounded-lg border border-[var(--border)] bg-white text-[var(--ink)] text-[12.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--blue-50)]"
        >
          {t("pagination.prev")}
        </button>
        {pages.map((p, idx) =>
          p === "..." ? (
            <span key={`e-${idx}`} className="px-1 text-[var(--sub)]">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[34px] h-[34px] px-2 rounded-lg border text-[12.5px] font-medium ${
                p === page
                  ? "bg-[var(--blue)] text-white border-[var(--blue)]"
                  : "border-[var(--border)] bg-white text-[var(--ink)] hover:bg-[var(--blue-50)]"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="min-w-[34px] h-[34px] px-2 rounded-lg border border-[var(--border)] bg-white text-[var(--ink)] text-[12.5px] font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--blue-50)]"
        >
          {t("pagination.next")}
        </button>
      </div>
    </div>
  );
}
