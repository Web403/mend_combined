import { createContext, useContext, useEffect } from "react"

/**
 * Breadcrumb context shared by the shell and detail pages. Kept in its own
 * module (no component exports) for fast-refresh friendliness.
 */
export const CrumbsContext = createContext(null)

/**
 * Detail pages call useSetCrumbs([...]) to replace the URL-derived trail with
 * a human name (hotel / course title). Passing null restores the default;
 * it resets automatically on unmount.
 */
export function useSetCrumbs(crumbs) {
  const ctx = useContext(CrumbsContext)
  const key = JSON.stringify(crumbs ?? null)
  useEffect(() => {
    if (!ctx) return undefined
    ctx.setOverride(crumbs ? JSON.parse(key) : null)
    return () => ctx.setOverride(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ctx, key])
}
