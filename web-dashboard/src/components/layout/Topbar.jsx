import { useNavigate } from "react-router-dom"
import { clearAdminSession, getAdminSession } from "../../api/auth"
import { IconLogout, IconMenu } from "../ui/Icons"
import { getInitials } from "../../utils/format"

/**
 * Top bar: breadcrumbs (where am I?) + real account controls only.
 * No fake notifications/search — everything here works.
 */
export default function Topbar({ crumbs, onOpenMobile }) {
  const session = getAdminSession()
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        aria-label="Open menu"
        className="-ml-1 rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
      >
        <IconMenu size={18} />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1 overflow-hidden whitespace-nowrap text-[13px]">
          {crumbs.map((crumb, i) => {
            const last = i === crumbs.length - 1
            return (
              <li key={`${crumb.label}-${i}`} className="flex min-w-0 items-center gap-1">
                {i > 0 && <span className="select-none text-slate-300" aria-hidden="true">/</span>}
                {crumb.to && !last ? (
                  <a
                    href={crumb.to}
                    className="rounded px-1 py-0.5 font-medium text-slate-500 no-underline hover:text-brand-700"
                    onClick={(e) => {
                      e.preventDefault()
                      navigate(crumb.to)
                    }}
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current={last ? "page" : undefined} className={`truncate px-1 ${last ? "font-semibold text-slate-800" : "text-slate-500"}`}>
                    {crumb.label}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-2">
        <div
          className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 sm:flex"
          title={session.email ? `Signed in as ${session.email}` : "Signed in"}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-800 text-[10px] font-bold text-white">
            {getInitials(session.email || "Admin")}
          </span>
          <span className="max-w-44 truncate text-xs font-medium text-slate-600">{session.email || "Platform admin"}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            clearAdminSession()
            navigate("/", { replace: true })
          }}
          aria-label="Sign out"
          title="Sign out"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <IconLogout size={16} />
        </button>
      </div>
    </header>
  )
}
