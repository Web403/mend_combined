import Pagination from "./Pagination"
import { EmptyState, ErrorState } from "./States"
import { TableSkeleton } from "./Skeleton"
import { IconSort, IconSortAsc, IconSortDesc } from "./Icons"

/**
 * One table behavior for every admin list: fixed row height, right-aligned
 * actions, sortable headers, loading skeleton, empty + error states and
 * consistent pagination. Pages own data fetching; this owns presentation.
 *
 * columns: [{ key, label, sortable, align: "right"|"center", width, render(row) }]
 * `render` receives (row, rowIndex); if omitted falls back to row[key].
 */
export default function DataTable({
  columns,
  rows = [],
  keyField = "_id",
  loading = false,
  error = "",
  onRetry,
  sort, // { by, order, onSort }
  pagination, // { page, limit, total, totalPages, onPage }
  onRowClick,
  empty = {},
  footer,
  className = "",
}) {
  const sortable = Boolean(sort)

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {error ? (
        <ErrorState
          title={error.title ?? "We couldn't load this list"}
          message={typeof error === "string" ? error : error.message}
          onRetry={onRetry}
        />
      ) : loading && rows.length === 0 ? (
        <TableSkeleton cols={Math.min(columns.length, 6)} rows={5} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                {columns.map((col) => {
                  const isSorted = sort?.by === col.key
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      style={col.width ? { minWidth: col.width } : undefined}
                      className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 select-none whitespace-nowrap ${
                        col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.sortable && sortable ? (
                        <button
                          type="button"
                          onClick={() => sort.onSort(col.key)}
                          className={`inline-flex items-center gap-1 rounded uppercase transition hover:text-slate-800 ${
                            isSorted ? "text-slate-800" : ""
                          }`}
                        >
                          {col.label}
                          {isSorted ? (
                            sort.order === "asc" ? (
                              <IconSortAsc size={11} />
                            ) : (
                              <IconSortDesc size={11} />
                            )
                          ) : (
                            <span className="text-slate-300">
                              <IconSort size={11} />
                            </span>
                          )}
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className={loading ? "opacity-50" : ""}>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-0">
                    <EmptyState
                      title={empty.title ?? "Nothing here yet"}
                      description={empty.description}
                      action={empty.action}
                      compact
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr
                    key={row[keyField] ?? row.id ?? idx}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === "Enter") onRowClick(row)
                          }
                        : undefined
                    }
                    className={`border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70 ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-4 py-3 align-middle text-[13px] text-slate-700 ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                        } ${col.cellClassName ?? ""}`}
                      >
                        {col.render ? col.render(row, idx) : row[col.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {footer}

      {pagination && rows.length > 0 && (
        <Pagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total ?? 0}
          totalPages={pagination.totalPages}
          onPage={pagination.onPage}
        />
      )}
    </div>
  )
}
