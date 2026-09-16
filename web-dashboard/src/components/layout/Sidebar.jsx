import { useEffect, useRef, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { NAV_SECTIONS } from "../../routes/navigation"
import { clearAdminSession, getAdminSession } from "../../api/auth"
import { IconChevronLeft, IconChevronRight, IconClose, IconLogout } from "../ui/Icons"

const COLLAPSE_KEY = "mend.sidebar.collapsed"

/**
 * Sectioned navigation. Desktop: fixed rail with labels; optional collapsed
 * icon mode (persisted) — but labels are always the default. Mobile: overlay
 * drawer. Active page is marked with aria-current + a left accent bar.
 */
export default function Sidebar({ mobileOpen, onCloseMobile }) {
  const navigate = useNavigate()
  const session = getAdminSession()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === "1")
  const panelRef = useRef(null)

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1")
      return !c
    })
  }

  useEffect(() => {
    if (!mobileOpen) return undefined
    function onKey(e) {
      if (e.key === "Escape") onCloseMobile?.()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [mobileOpen, onCloseMobile])

  const handleSignOut = () => {
    clearAdminSession()
    navigate("/", { replace: true })
  }

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[1px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        ref={panelRef}
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white transition-[width,transform] duration-150
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${collapsed ? "lg:w-16" : "lg:w-60"}
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Brand */}
        <div className={`flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-200 px-4 ${collapsed ? "lg:justify-center lg:px-2" : ""}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-800 text-sm font-bold text-white">
            M
          </span>
          <div className={`min-w-0 ${collapsed ? "lg:hidden" : ""}`}>
            <p className="truncate text-[13px] font-semibold leading-tight text-slate-900">Mend Admin</p>
            <p className="text-[10px] leading-tight text-slate-400">Platform console</p>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
          >
            <IconClose size={16} />
          </button>
        </div>

        {/* Nav sections */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3">
          {NAV_SECTIONS.map((section, si) => (
            <div key={section.label ?? `core-${si}`} className={si > 0 ? "mt-4" : ""}>
              {section.label && (
                <p
                  className={`px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 ${
                    collapsed ? "lg:hidden" : ""
                  }`}
                >
                  {section.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-2.5 rounded-lg py-2 text-[13px] font-medium no-underline transition-colors ${
                          collapsed ? "lg:justify-center lg:px-0" : "px-2.5"
                        } ${
                          isActive
                            ? "bg-brand-50 text-brand-800"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className={`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-brand-700 ${
                                collapsed ? "lg:hidden" : ""
                              }`}
                            />
                          )}
                          <span className={`shrink-0 ${isActive ? "text-brand-700" : "text-slate-400 group-hover:text-slate-600"}`}>
                            <item.icon size={16} />
                          </span>
                          <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>{item.label}</span>
                          {isActive && <span className="sr-only"> (current page)</span>}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Account + sign out */}
        <div className={`shrink-0 border-t border-slate-200 p-2.5 ${collapsed ? "lg:hidden" : ""}`}>
          <div className="mb-1 rounded-lg bg-slate-50 px-2.5 py-2 ring-1 ring-slate-200">
            <p className="truncate text-[11px] font-medium text-slate-700" title={session.email || ""}>
              {session.email || "Signed in"}
            </p>
            {session.role && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{session.role}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <IconLogout size={15} className="text-slate-400" />
            Sign out
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden border-t border-slate-200 p-2.5 lg:block">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 ${
              collapsed ? "justify-center px-0" : ""
            }`}
          >
            {collapsed ? <IconChevronRight size={14} /> : <IconChevronLeft size={14} />}
            <span className={collapsed ? "hidden" : ""}>Collapse</span>
          </button>
        </div>
      </aside>
    </>
  )
}
