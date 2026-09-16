import OverlayBackdrop from "./Overlay"
import useOverlayFocus from "../../hooks/useOverlayFocus"
import { IconClose } from "./Icons"

/**
 * Right-side panel for quick inspection of secondary information (user detail).
 * Full entity management uses real pages instead — drawers shouldn't become forms.
 */
export default function Drawer({ open, onClose, title, subtitle, headerExtra, children, footer, width = "max-w-xl" }) {
  const panelRef = useOverlayFocus({ open, onClose })
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <OverlayBackdrop onClose={onClose} className="bg-slate-900/40" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Details"}
        className={`relative z-10 flex h-full w-full ${width} flex-col bg-white shadow-2xl ring-1 ring-slate-900/10`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
            {headerExtra && <div className="mt-2 flex flex-wrap items-center gap-1.5">{headerExtra}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="-m-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/70 px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-5 py-3.5">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  )
}
