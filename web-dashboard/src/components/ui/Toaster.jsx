import { useEffect, useRef } from "react"
import { ToastContext, useToastState } from "../../hooks/useToast"
import { IconCheckCircle, IconErrorCircle } from "./Icons"

/**
 * One toast system for the whole app (previously every page hand-rolled a
 * fixed-position Toast and some pages had none). Rendered once at the root.
 */
export function ToastProvider({ children }) {
  const { toasts, toast, dismiss } = useToastState()
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastViewport({ toasts, onDismiss }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onDismiss }) {
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  const isError = toast.tone === "error"
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role={isError ? "alert" : "status"}
      className={`pointer-events-auto flex items-start gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-medium text-white shadow-lg ${
        isError ? "bg-slate-900" : "bg-emerald-700"
      }`}
    >
      <span className="mt-px shrink-0">
        {isError ? <IconErrorCircle size={15} /> : <IconCheckCircle size={15} />}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-0.5 text-white/60 hover:bg-white/10 hover:text-white"
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
