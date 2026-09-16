export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" />
}

/** Skeleton that mirrors a table while data loads (never a blank screen). */
export function TableSkeleton({ rows = 6, cols = 5, widths }) {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Loading">
      <div className="flex gap-4 bg-slate-50 px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-2.5 flex-1 max-w-28" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className="h-3.5 flex-1"
              style={widths?.[c] ? { maxWidth: widths[c] } : undefined}
            />
          ))}
        </div>
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}

export function CardSkeleton({ lines = 3 } = {}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5" role="status" aria-label="Loading">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} className="mt-2 h-2.5 w-full" />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  )
}
