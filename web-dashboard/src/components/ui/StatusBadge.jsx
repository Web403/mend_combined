/**
 * Semantic status badges. Status is always carried by the label text (never
 * color alone); the dot is a secondary cue. Tones map to shared label helpers
 * in utils/labels.js so a status looks identical on every screen.
 */
const TONES = {
  neutral: { wrap: "bg-slate-100 text-slate-600 ring-slate-200", dot: "bg-slate-400" },
  success: { wrap: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  warning: { wrap: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  danger: { wrap: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
  info: { wrap: "bg-brand-50 text-brand-700 ring-brand-200", dot: "bg-brand-500" },
}

export default function StatusBadge({ tone = "neutral", dot = true, children, className = "" }) {
  const t = TONES[tone] ?? TONES.neutral
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${t.wrap} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />}
      {children}
    </span>
  )
}

/** Pill for non-status metadata (plans, roles, difficulty…) — no state dot. */
export function Tag({ children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 ${className}`}
    >
      {children}
    </span>
  )
}
