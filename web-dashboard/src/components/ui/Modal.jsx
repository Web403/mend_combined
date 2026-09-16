import OverlayBackdrop from "./Overlay"
import useOverlayFocus from "../../hooks/useOverlayFocus"
import { IconClose } from "./Icons"

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
}

/**
 * Centered dialog for confirmations and short forms. Complex, multi-section
 * forms are full pages instead (e.g. hotel create/edit) — modal overload was a
 * diagnosed problem in the previous UI.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  labelledBy,
}) {
  const panelRef = useOverlayFocus({ open, onClose })
  if (!open) return null

  const titleId = labelledBy ?? "modal-title"

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <OverlayBackdrop onClose={closeOnBackdrop ? onClose : undefined} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 my-auto flex max-h-[92vh] w-full flex-col rounded-xl bg-white shadow-xl ring-1 ring-slate-900/5 ${SIZES[size] ?? SIZES.md}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900">
              {title}
            </h2>
            {description && <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="-m-1 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconClose size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-slate-50/60 px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}
