import { useRef } from "react"

/**
 * Accessible tablist (roving tabindex + arrow keys) used by detail pages.
 * The page keeps the active value in the URL so tabs are linkable.
 */
export default function Tabs({ tabs, value, onChange, className = "" }) {
  const refs = useRef([])

  function onKeyDown(e) {
    const idx = tabs.findIndex((t) => t.id === value)
    let next = null
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length
    if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length
    if (e.key === "Home") next = 0
    if (e.key === "End") next = tabs.length - 1
    if (next !== null) {
      e.preventDefault()
      onChange(tabs[next].id)
      refs.current?.[next]?.focus()
    }
  }

  return (
    <div className={`flex gap-1 overflow-x-auto border-b border-slate-200 ${className}`} role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((tab, i) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={active}
            aria-controls={`panel-${tab.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`relative -mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13px] font-medium transition-colors ${
              active
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count != null && (
              <span
                className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${
                  active ? "bg-brand-100 text-brand-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ id, active, children }) {
  if (!active) return null
  return (
    <div role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={-1}>
      {children}
    </div>
  )
}
