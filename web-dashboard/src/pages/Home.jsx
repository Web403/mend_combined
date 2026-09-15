import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getAdminAnalyticsSummary } from "../api/analytics"
import { getErrorMessage } from "../api/api"

const METRICS = [
  {
    key: "totalHotels",
    label: "Total Hotels",
    sub: "Registered properties",
    tone: "blue",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    key: "activeEmployees",
    label: "Active Employees",
    sub: "Currently active staff",
    tone: "emerald",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    key: "activeManagers",
    label: "Active Managers",
    sub: "Manager accounts",
    tone: "violet",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    key: "attendanceToday",
    label: "Attendance Today",
    sub: "Check-ins recorded",
    tone: "sky",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <polyline points="9 16 11 18 15 14" />
      </svg>
    ),
  },
  {
    key: "complianceScore",
    label: "Compliance Score",
    sub: "Platform-wide average",
    suffix: "%",
    tone: "amber",
    isScore: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    key: "fatigueAlerts",
    label: "Fatigue Alerts",
    sub: "Open fatigue flags",
    tone: "rose",
    isAlert: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    key: "sosIncidents",
    label: "SOS Incidents",
    sub: "Reported incidents",
    tone: "red",
    isAlert: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: "openJobs",
    label: "Open Jobs",
    sub: "Active job posts",
    tone: "indigo",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    key: "newApplications",
    label: "New Applications",
    sub: "Fresh candidate entries",
    tone: "cyan",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    key: "certifiedHotels",
    label: "Certified Hotels",
    sub: "Compliance certified",
    tone: "teal",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
]

const TONES = {
  amber: {
    badge: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
  },
  blue: {
    badge: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    dot: "bg-blue-400",
    bar: "bg-blue-400",
  },
  cyan: {
    badge: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
    dot: "bg-cyan-400",
    bar: "bg-cyan-400",
  },
  emerald: {
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    dot: "bg-emerald-400",
    bar: "bg-emerald-400",
  },
  indigo: {
    badge: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    dot: "bg-indigo-400",
    bar: "bg-indigo-400",
  },
  red: {
    badge: "bg-red-50 text-red-700 ring-1 ring-red-200",
    dot: "bg-red-400",
    bar: "bg-red-400",
  },
  rose: {
    badge: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    dot: "bg-rose-400",
    bar: "bg-rose-400",
  },
  sky: {
    badge: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
  },
  teal: {
    badge: "bg-teal-50 text-teal-700 ring-1 ring-teal-200",
    dot: "bg-teal-400",
    bar: "bg-teal-400",
  },
  violet: {
    badge: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    dot: "bg-violet-400",
    bar: "bg-violet-400",
  },
}

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "-"
  if (typeof value === "number") return `${value.toLocaleString("en-IN")}${suffix}`
  return `${value}${suffix}`
}

function getStatusLabel(metric, value) {
  if (metric.isAlert) {
    if (value === 0) return { text: "All clear", ok: true }
    return { text: `${value} open`, ok: false }
  }
  if (metric.isScore) {
    if (value >= 90) return { text: "Excellent", ok: true }
    if (value >= 70) return { text: "Moderate", ok: null }
    return { text: "Needs attention", ok: false }
  }
  return null
}

function ComplianceBar({ value, tone }) {
  return (
    <div className="mt-3">
      <div className="h-1 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${TONES[tone].bar}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatusPill({ label }) {
  if (!label) return null
  const base = "inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
  if (label.ok === true) return (
    <span className={`${base} bg-emerald-50 text-emerald-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      {label.text}
    </span>
  )
  if (label.ok === false) return (
    <span className={`${base} bg-red-50 text-red-600`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
      {label.text}
    </span>
  )
  return (
    <span className={`${base} bg-amber-50 text-amber-700`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
      {label.text}
    </span>
  )
}

function MetricCard({ stat }) {
  const rawValue = stat._rawValue
  const statusLabel = getStatusLabel(stat, rawValue)
  const tone = TONES[stat.tone]

  return (
    <div className="group bg-white border border-slate-200 rounded-xl p-5 min-h-[148px] flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all duration-150">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone.badge}`}>
          {stat.icon}
        </div>
        {statusLabel && <StatusPill label={statusLabel} />}
      </div>

      <div className="flex-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
          {stat.label}
        </p>
        <p className="text-[28px] font-bold text-slate-900 leading-none tracking-tight">
          {stat.value}
        </p>
        {stat.isScore && typeof rawValue === "number" && (
          <ComplianceBar value={rawValue} tone={stat.tone} />
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-2">{stat.sub}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[148px] flex flex-col justify-between">
      <div className="flex items-start justify-between mb-3">
        <div className="h-8 w-8 rounded-lg bg-slate-100 animate-pulse" />
      </div>
      <div className="flex-1 space-y-2">
        <div className="h-2.5 w-20 rounded bg-slate-100 animate-pulse" />
        <div className="h-7 w-12 rounded bg-slate-100 animate-pulse" />
      </div>
      <div className="h-2 w-28 rounded bg-slate-100 animate-pulse mt-2" />
    </div>
  )
}

export default function Home() {
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getAdminAnalyticsSummary()
      setSummary(data)
      setLastUpdated(new Date())
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load analytics summary."))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const cards = useMemo(
    () =>
      METRICS.map((metric) => ({
        ...metric,
        value: formatValue(summary[metric.key], metric.suffix),
        _rawValue: summary[metric.key],
      })),
    [summary]
  )

  const totalAlerts = useMemo(() => {
    const f = summary.fatigueAlerts ?? 0
    const s = summary.sosIncidents ?? 0
    return f + s
  }, [summary])

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-7 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-xl font-bold text-slate-900">Overview</h1>
            {!loading && totalAlerts > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 ring-1 ring-red-200">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block" />
                {totalAlerts} alert{totalAlerts > 1 ? "s" : ""}
              </span>
            )}
            {!loading && totalAlerts === 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                No alerts
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Live platform analytics
            {lastUpdated && (
              <span className="text-slate-400">
                {" "}· Updated at {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </p>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className={loading ? "animate-spin" : ""}
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
          >
            <path d="M21 12a9 9 0 11-2.64-6.36" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
          <button
            onClick={fetchSummary}
            className="text-xs px-2.5 py-1 border border-red-300 rounded-lg hover:bg-red-100 transition ml-3 shrink-0 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="border-t border-slate-100 mb-5" />

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {loading
          ? METRICS.map((m) => <SkeletonCard key={m.key} />)
          : cards.map((stat) => <MetricCard key={stat.key} stat={stat} />)}
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { to: "/dashboard/hotels", title: "Hotels", desc: "Tenant directory, subscriptions, onboarding" },
          { to: "/dashboard/users", title: "Users", desc: "Platform user directory and account actions" },
          { to: "/dashboard/analytics", title: "Analytics", desc: "Platform summary and CSV export" },
          { to: "/dashboard/compliance", title: "Compliance", desc: "Certification tiers across hotels" },
          { to: "/dashboard/rbac", title: "Access control", desc: "Hotel-scoped RBAC permission rules" },
          { to: "/dashboard/lms/courses", title: "LMS courses", desc: "Catalog, content, and publish state" },
          { to: "/dashboard/lms/categories", title: "LMS categories", desc: "Organize the learning catalog" },
          { to: "/dashboard/lms/enrollments", title: "Enrollments", desc: "Review and approve course access" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition no-underline"
          >
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}