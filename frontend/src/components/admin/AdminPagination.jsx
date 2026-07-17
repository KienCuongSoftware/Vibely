import React, { useMemo } from "react";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

function buildPageItems(current, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages, current]);
  for (let i = current - 1; i <= current + 1; i += 1) {
    if (i >= 1 && i <= totalPages) pages.add(i);
  }
  if (current <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (current >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const items = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const value = sorted[i];
    if (i > 0 && value - sorted[i - 1] > 1) {
      items.push("ellipsis");
    }
    items.push(value);
  }
  return items;
}

/**
 * @param {{
 *   page: number;
 *   total: number;
 *   pageSize: number;
 *   onPageChange: (page: number) => void;
 *   hasNext?: boolean;
 *   className?: string;
 * }} props
 */
export function AdminPagination({
  page,
  total,
  pageSize,
  onPageChange,
  hasNext = false,
  className = "",
}) {
  const totalPages = useMemo(() => {
    const size = Math.max(1, Number(pageSize) || 1);
    const fromTotal = Math.ceil(Math.max(0, Number(total) || 0) / size);
    if (fromTotal > 0) return fromTotal;
    return Math.max(1, (Number(page) || 0) + 1 + (hasNext ? 1 : 0));
  }, [hasNext, page, pageSize, total]);

  const current = Math.min(Math.max(0, Number(page) || 0), totalPages - 1) + 1;
  const items = useMemo(
    () => buildPageItems(current, totalPages),
    [current, totalPages],
  );

  if (totalPages <= 1 && !hasNext) return null;

  const goTo = (nextPageIndex) => {
    const clamped = Math.min(Math.max(0, nextPageIndex), totalPages - 1);
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <nav
      className={`mt-4 flex flex-wrap items-center justify-end gap-1.5 ${className}`}
      aria-label="Phân trang"
    >
      <button
        type="button"
        disabled={current <= 1}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang trước"
        onClick={() => goTo(page - 1)}
      >
        <IoChevronBack className="text-lg" aria-hidden />
      </button>

      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-sm text-zinc-500"
            aria-hidden
          >
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Trang ${item}`}
            aria-current={item === current ? "page" : undefined}
            onClick={() => goTo(item - 1)}
            className={
              item === current
                ? "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-rose-500/60 bg-rose-500/15 px-2.5 text-sm font-semibold text-rose-200"
                : "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-zinc-700 px-2.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
            }
          >
            {item}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={current >= totalPages && !hasNext}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Trang sau"
        onClick={() => {
          if (current < totalPages) goTo(page + 1);
          else if (hasNext) onPageChange(page + 1);
        }}
      >
        <IoChevronForward className="text-lg" aria-hidden />
      </button>
    </nav>
  );
}
