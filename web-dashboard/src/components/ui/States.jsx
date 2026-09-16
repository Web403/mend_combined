import Button from "./Button"
import { IconAlert, IconErrorCircle, IconInbox } from "./Icons"

/**
 * Intentional empty/error states used by every list & detail screen.
 * Empty state always explains: what is empty, why, what to do.
 * Error state never exposes raw backend text (normalized upstream in useAsyncData).
 */
export function EmptyState({ icon, title, description, action, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 text-center ${compact ? "py-10" : "py-16"}`}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon ?? <IconInbox size={20} />}
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = "We couldn't load this data", message, onRetry, compact = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 text-center ${
        compact ? "px-4 py-6" : "px-6 py-12"
      }`}
      role="alert"
    >
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
        <IconErrorCircle size={20} />
      </span>
      <p className="text-sm font-semibold text-red-800">{title}</p>
      {message && <p className="mt-1 max-w-md text-[13px] leading-relaxed text-red-700/80">{message}</p>}
      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<IconAlert size={13} />}
          className="mt-4 bg-white"
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  )
}

/** Compact inline banner for action errors that stay on the page. */
export function InlineAlert({ tone = "danger", children, onDismiss }) {
  const tones = {
    danger: "border-red-200 bg-red-50 text-red-700",
    info: "border-brand-200 bg-brand-50 text-brand-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }
  if (!children) return null
  return (
    <div
      role="alert"
      className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-[13px] leading-relaxed ${tones[tone]}`}
    >
      <span className="min-w-0">{children}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-[11px] font-semibold underline underline-offset-2 opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
