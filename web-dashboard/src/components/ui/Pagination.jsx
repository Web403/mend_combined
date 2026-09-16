import { IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "./Icons"

function PageBtn({ children, onClick, disabled, active, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`h-7 min-w-7 rounded-md border px-1.5 text-xs font-medium transition ${
        active
          ? "border-brand-300 bg-brand-50 text-brand-700"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  )
}

/** Compact, table-footer pagination: range label + first/prev/window/next/last. */
export default function Pagination({ page, limit, total, totalPages, onPage, className = "" }) {
  const safeTotalPages = Math.max(1, totalPages || 1)
  const start = total === 0 ? 0 : (page - 1) * limit + 1
  const end = Math.min(page * limit, total)

  const window = (() => {
    const size = Math.min(5, safeTotalPages)
    if (safeTotalPages <= 5) return Array.from({ length: safeTotalPages }, (_, i) => i + 1)
    if (page <= 3) return [1, 2, 3, 4, 5]
    if (page >= safeTotalPages - 2)
      return Array.from({ length: size }, (_, i) => safeTotalPages - size + 1 + i)
    return [page - 2, page - 1, page, page + 1, page + 2]
  })()

  return (
    <nav
      aria-label="Pagination"
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 ${className}`}
    >
      <p className="text-xs text-slate-500" aria-live="polite">
        {total === 0 ? (
          "No results"
        ) : (
          <>
            <span className="font-medium text-slate-700">
              {start.toLocaleString("en-IN")}–{end.toLocaleString("en-IN")}
            </span>{" "}
            of {total.toLocaleString("en-IN")}
          </>
        )}
      </p>
      <div className="flex items-center gap-1">
        <PageBtn label="First page" onClick={() => onPage(1)} disabled={page <= 1}>
          <IconChevronsLeft size={13} />
        </PageBtn>
        <PageBtn label="Previous page" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <IconChevronLeft size={13} />
        </PageBtn>
        {window.map((p) => (
          <PageBtn key={p} onClick={() => onPage(p)} active={p === page} label={`Page ${p}`}>
            {p}
          </PageBtn>
        ))}
        <PageBtn
          label="Next page"
          onClick={() => onPage(page + 1)}
          disabled={page >= safeTotalPages}
        >
          <IconChevronRight size={13} />
        </PageBtn>
        <PageBtn
          label="Last page"
          onClick={() => onPage(safeTotalPages)}
          disabled={page >= safeTotalPages}
        >
          <IconChevronsRight size={13} />
        </PageBtn>
      </div>
    </nav>
  )
}
