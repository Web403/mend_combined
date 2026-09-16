/** Consistent surface treatment: same padding, radius, border and heading scale everywhere. */

export default function Card({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white ${className}`} {...rest}>
      {children}
    </section>
  )
}

export function CardHeader({ title, subtitle, actions, icon, className = "" }) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {icon && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function CardBody({ className = "", children }) {
  return <div className={`px-5 pb-5 ${className}`}>{children}</div>
}

/** Label/value pair used across all detail screens. */
export function DetailItem({ label, value, children, className = "" }) {
  const content = children ?? value
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm text-slate-800" title={typeof content === "string" ? content : undefined}>
        {content === undefined || content === null || content === "" ? "—" : content}
      </p>
    </div>
  )
}

export function DetailGrid({ cols = 3, className = "", children }) {
  const map = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }
  return <div className={`grid grid-cols-1 gap-x-4 gap-y-4 ${map[cols] ?? map[3]} ${className}`}>{children}</div>
}
