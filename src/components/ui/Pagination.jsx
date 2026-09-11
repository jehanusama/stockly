import { useMemo } from "react";

export function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (validPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, validPage * pageSize);

  // Generate page numbers array with ellipses
  const pageNumbers = useMemo(() => {
    const pages = [];
    const delta = 1;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= validPage - delta && i <= validPage + delta)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "...") {
        pages.push("...");
      }
    }
    return pages;
  }, [validPage, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div
      className={[
        "flex flex-col sm:flex-row items-center justify-between gap-4 py-3.5 px-2 border-t border-[var(--color-app-border)] select-none",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Left side: Item counters & page size selector */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-app-text-muted)] flex-wrap justify-center sm:justify-start">
        <span>
          Showing <strong className="text-[var(--color-app-text)]">{startItem}</strong> to{" "}
          <strong className="text-[var(--color-app-text)]">{endItem}</strong> of{" "}
          <strong className="text-[var(--color-app-text)]">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span>Show</span>
            <div className="relative">
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  if (onPageChange) onPageChange(1);
                }}
                className="h-8 pl-2 pr-7 rounded-md text-xs font-semibold appearance-none bg-[var(--color-app-bg)] text-[var(--color-app-text)] border border-[var(--color-app-border)] focus:outline-none focus:ring-1 focus:ring-[var(--color-app-border-focus)] cursor-pointer"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#1f2937] text-[#f3f4f6]">
                    {opt}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[var(--color-app-text-muted)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
            <span>per page</span>
          </div>
        )}
      </div>

      {/* Right side: Page navigation controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={validPage === 1}
            title="First Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"></polyline><polyline points="18 17 13 12 18 7"></polyline></svg>
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(validPage - 1)}
            disabled={validPage === 1}
            title="Previous Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          {/* Page numbers */}
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span key={`dots-${idx}`} className="w-7 h-8 flex items-center justify-center text-xs text-[var(--color-app-text-muted)]">
                  ...
                </span>
              );
            }

            const isActive = p === validPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={[
                  "h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center",
                  isActive
                    ? "bg-[var(--color-app-accent)] text-white shadow-sm font-bold"
                    : "border border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)]",
                ].join(" ")}
              >
                {p}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(validPage + 1)}
            disabled={validPage === totalPages}
            title="Next Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          {/* Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={validPage === totalPages}
            title="Last Page"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-panel)] text-[var(--color-app-text-muted)] hover:text-[var(--color-app-text)] hover:bg-[var(--color-app-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;
