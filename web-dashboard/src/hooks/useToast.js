import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

/**
 * App-wide toast context. The provider/viewport lives in components/ui/Toaster.jsx;
 * the context + hook live here (module rule: components files shouldn't export
 * non-components).
 */
export const ToastContext = createContext(null)

export function useToastState() {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const push = useCallback((toast) => {
    idRef.current += 1
    const id = idRef.current
    setToasts((list) => [...list, { id, ...toast }])
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), toast.duration ?? 4200)
  }, [])

  const toast = useMemo(
    () => ({
      success: (message) => push({ tone: "success", message }),
      error: (message) => push({ tone: "error", message, duration: 6000 }),
    }),
    [push]
  )

  return { toasts, toast, dismiss: (id) => setToasts((l) => l.filter((t) => t.id !== id)) }
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>")
  return ctx
}
