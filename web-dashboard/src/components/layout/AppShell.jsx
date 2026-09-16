import { useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"
import { crumbsFromPath } from "../../routes/navigation"
import { ToastProvider } from "../ui/Toaster"
import { CrumbsContext } from "./crumbs"

/**
 * The application shell — identical on every authenticated page:
 * sidebar (section nav) + topbar (breadcrumbs, account) + content area.
 * Detail pages supply richer breadcrumb labels via useSetCrumbs (./crumbs.js).
 */

export default function AppShell() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [override, setOverride] = useState(null)

  const crumbs = useMemo(
    () => override ?? crumbsFromPath(location.pathname),
    [location.pathname, override]
  )

  const ctx = useMemo(() => ({ setOverride }), [])

  return (
    <ToastProvider>
      <CrumbsContext.Provider value={ctx}>
        <div className="flex min-h-screen">
          <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar crumbs={crumbs} onOpenMobile={() => setMobileOpen(true)} />
            <main className="mx-auto w-full max-w-[1500px] flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8">
              <Outlet />
            </main>
          </div>
        </div>
      </CrumbsContext.Provider>
    </ToastProvider>
  )
}
