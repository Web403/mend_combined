import { useCallback, useEffect, useRef, useState } from "react"
import { getErrorMessage } from "../api/api"

/**
 * Minimal data-fetch state machine shared by every page so loading/error/empty
 * handling behaves identically everywhere (previously each page improvised).
 *
 *   const { data, loading, error, reload, busy, runAction } = useAsyncData(loader)
 *
 * - loader: async function -> data. Re-runs when `deps` change. When no deps
 *   are given, the loader's own identity (a useCallback) drives the refresh —
 *   so pages whose loader closes over filters/page/search refetch correctly.
 * - runAction(fn, successMessage?): mutation wrapper with a busy flag; surfaces
 *   normalized errors (never raw backend text) and returns { ok, result, error }.
 */
export default function useAsyncData(loader, { deps, initialData = null } = {}) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  // `loader` is always a useCallback in our pages; its identity is the true
  // refresh signal. Explicit `deps` are additionally honored when given.
  const load = useCallback(
    async () => {
      setLoading(true)
      setError("")
      try {
        const result = await loader()
        if (mounted.current) setData(result)
        return result
      } catch (err) {
        if (mounted.current) setError(normalizeLoadError(err))
        return undefined
      } finally {
        if (mounted.current) setLoading(false)
      }
    },
    deps ? [loader, ...deps] : [loader] // eslint-disable-line react-hooks/exhaustive-deps
  )

  useEffect(() => {
    load()
  }, [load])

  const runAction = useCallback(async (fn) => {
    setBusy(true)
    setError("")
    try {
      const result = await fn()
      return { ok: true, result }
    } catch (err) {
      const message = normalizeLoadError(err)
      setError(message)
      return { ok: false, error: message }
    } finally {
      setBusy(false)
    }
  }, [])

  return { data, setData, loading, error, setError, reload: load, busy, runAction }
}

/** Human message for any axios-style error; hides transport noise. */
export function normalizeLoadError(err) {
  const status = err?.response?.status
  if (status === 403) {
    return "Your account isn't allowed to perform this operation. The backend enforces these permissions."
  }
  if (status === 401) {
    return "Your session has expired. Please sign in again."
  }
  if (status === 404) {
    return getErrorMessage(err, "We couldn't find what you were looking for.")
  }
  if (!err?.response && err?.message && /network|timeout/i.test(err.message)) {
    return "We couldn't reach the Mend API. Check your connection and try again."
  }
  return getErrorMessage(err, "Something went wrong. Please try again.")
}
