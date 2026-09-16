/** Shared display formatters (previously duplicated across pages). */

export function formatValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return value.toLocaleString("en-IN")
  return String(value)
}

export function formatDate(value, fallback = "—") {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
}

export function formatDateTime(value, fallback = "—") {
  if (!value) return fallback
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

export function formatTime(value) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

export function getInitials(name = "") {
  return (
    String(name)
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?"
  )
}

/** Deterministic soft avatar palette keyed by entity id. */
const AVATAR_TONES = [
  "bg-brand-50 text-brand-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
  "bg-sky-50 text-sky-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
  "bg-teal-50 text-teal-700",
]

export function avatarTone(key = "") {
  let hash = 0
  const s = String(key)
  for (let i = 0; i < s.length; i += 1) hash = (hash + s.charCodeAt(i)) % AVATAR_TONES.length
  return AVATAR_TONES[hash]
}

export function durationLabel(minutes) {
  const n = Number(minutes)
  if (!n || Number.isNaN(n) || n <= 0) return "Not set"
  if (n < 60) return `${n} min`
  const h = Math.floor(n / 60)
  const m = n % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Strip "hotel_abc12345" style ids down to something human when possible. */
export function shortId(id) {
  if (!id) return "—"
  const s = String(id)
  return s.length > 14 ? `${s.slice(0, 10)}…` : s
}
