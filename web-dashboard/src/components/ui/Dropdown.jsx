import { useEffect, useId, useRef, useState } from "react"
import { IconDots } from "./Icons"

/**
 * Lightweight "row actions" menu so tables don't need 4–6 equal buttons.
 * Items: { label, icon, onClick, danger, disabled, separatorBefore }
 */
export default function Dropdown({ items, label = "Row actions", align = "right", trigger }) {
  const [openState, setOpenState] = useState(false)
  const wrapRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!openState) return undefined
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenState(false)
    }
    function onKey(e) {
      if (e.key === "Escape") {
        setOpenState(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [openState])

  const enabled = items.filter(Boolean)
  if (!enabled.length) return null

  return (
    <div className="relative inline-flex" ref={wrapRef}>
      {trigger ? (
        <div onClick={() => setOpenState((o) => !o)}>{trigger(openState, () => setOpenState(false))}</div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          aria-label={label}
          aria-expanded={openState}
          aria-haspopup="menu"
          aria-controls={openState ? menuId : undefined}
          onClick={() => setOpenState((o) => !o)}
          className={`rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 ${
            openState ? "bg-slate-100 text-slate-700" : ""
          }`}
        >
          <IconDots size={16} />
        </button>
      )}

      {openState && (
        <div
          id={menuId}
          role="menu"
          className={`absolute top-full z-40 mt-1 min-w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-900/5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {enabled.map((item, i) => (
            <div key={item.label + i}>
              {item.separatorBefore && i > 0 && <div role="separator" className="my-1 border-t border-slate-100" />}
              <button
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpenState(false)
                  item.onClick?.()
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  item.danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className={`shrink-0 ${item.danger ? "text-red-500" : "text-slate-400"}`}>{item.icon}</span>
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
