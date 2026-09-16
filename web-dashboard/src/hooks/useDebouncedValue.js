import { useEffect, useState } from "react"

/** Debounce any fast-changing value (search inputs) before it hits state/fetch deps. */
export default function useDebouncedValue(value, delay = 350) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
