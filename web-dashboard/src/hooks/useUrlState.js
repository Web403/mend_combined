import { useCallback, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Read/write list-page state (search, filters, page, tab) in the URL query
 * string so views are linkable and survive reload / back button.
 *
 *   const [q, setQ] = useUrlState("q", { page: 1, limit: 25 })
 *   q.search, q.page (number), setQ({ search: "x" })
 */
export default function useUrlState(defaults) {
  const [params, setParams] = useSearchParams()

  const values = useMemo(() => {
    const out = {}
    Object.entries(defaults).forEach(([key, fallback]) => {
      const raw = params.get(key)
      if (typeof fallback === "number") {
        const n = Number(raw)
        out[key] = raw !== null && !Number.isNaN(n) && raw !== "" ? n : fallback
      } else {
        out[key] = raw ?? fallback
      }
    })
    return out
  }, [params, defaults])

  /** patch: partial values; keys matching defaults are removed for clean URLs. Reset `page` unless included. */
  const update = useCallback(
    (patch, { resetPage = true } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          const merged = { ...patch }
          if (resetPage && !("page" in patch) && "page" in defaults) merged.page = 1
          Object.entries(merged).forEach(([key, value]) => {
            const empty =
              value === "" || value === undefined || value === null || value === defaults[key] || value === "all"
            if (empty) next.delete(key)
            else next.set(key, String(value))
          })
          return next
        },
        { replace: true }
      )
    },
    [setParams, defaults]
  )

  return [values, update]
}
