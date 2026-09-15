import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  downloadAdminAnalyticsCsv,
  getAdminAnalyticsSummary,
  getHotelDashboard,
} from "../api/analytics"
import { getHotels, hotelKey } from "../api/hotels"
import { getErrorMessage } from "../api/api"

const PLATFORM_METRICS = [
  { key: "totalHotels", label: "Total hotels", why: "Tenant footprint across the platform" },
  { key: "activeEmployees", label: "Active employees", why: "Workforce currently marked active" },
  { key: "activeManagers", label: "Active managers", why: "Manager accounts across hotels" },
  { key: "attendanceToday", label: "Attendance today", why: "Clock-ins recorded today" },
  { key: "complianceScore", label: "Compliance score", why: "Platform average compliance %", suffix: "%" },
  { key: "certifiedHotels", label: "Certified hotels", why: "Hotels meeting certification threshold" },
  { key: "fatigueAlerts", label: "Fatigue alerts", why: "Open fatigue risk alerts", alert: true },
  { key: "sosIncidents", label: "SOS incidents", why: "Reported SOS events", alert: true },
  { key: "openJobs", label: "Open jobs", why: "Active recruitment listings" },
  { key: "newApplications", label: "New applications", why: "Recent candidate applications" },
]

function formatValue(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") return `${value.toLocaleString("en-IN")}${suffix}`
  return `${value}${suffix}`
}

export default function Analytics() {
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [hotelOptions, setHotelOptions] = useState([])
  const [scopeHotelId, setScopeHotelId] = useState("")
  const [hotelDash, setHotelDash] = useState(null)
  const [hotelLoading, setHotelLoading] = useState(false)
  const [hotelError, setHotelError] = useState("")
  const [exporting, setExporting] = useState(false)

  const loadSummary = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await getAdminAnalyticsSummary(
        scopeHotelId ? { hotelId: scopeHotelId } : {}
      )
      setSummary(data ?? {})
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load analytics summary."))
    } finally {
      setLoading(false)
    }
  }, [scopeHotelId])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const result = await getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" })
        if (!ignore) setHotelOptions(result.hotels ?? [])
      } catch {
        if (!ignore) setHotelOptions([])
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!scopeHotelId) {
      setHotelDash(null)
      setHotelError("")
      return
    }
    let ignore = false
    ;(async () => {
      setHotelLoading(true)
      setHotelError("")
      try {
        const data = await getHotelDashboard(scopeHotelId)
        if (!ignore) setHotelDash(data)
      } catch (e) {
        if (!ignore) {
          setHotelDash(null)
          setHotelError(getErrorMessage(e, "Failed to load hotel dashboard metrics."))
        }
      } finally {
        if (!ignore) setHotelLoading(false)
      }
    })()
    return () => {
      ignore = true
    }
  }, [scopeHotelId])

  async function handleExportCsv() {
    setExporting(true)
    try {
      const blob = await downloadAdminAnalyticsCsv(
        scopeHotelId ? { hotelId: scopeHotelId } : {}
      )
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mend-admin-analytics${scopeHotelId ? `-${scopeHotelId}` : ""}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(getErrorMessage(e, "Failed to export CSV."))
    } finally {
      setExporting(false)
    }
  }

  const cards = useMemo(
    () =>
      PLATFORM_METRICS.map((m) => ({
        ...m,
        value: formatValue(summary[m.key], m.suffix),
        raw: summary[m.key],
      })),
    [summary]
  )

  const hotelMetrics = hotelDash?.metrics

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-0.5">Platform analytics</h1>
          <p className="text-sm text-slate-500">
            Aggregates from <code className="text-xs bg-slate-100 px-1 rounded">/analytics/admin/summary</code>
            . Scope to a hotel to inspect tenant-level dashboard metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-700 min-w-[200px]"
            value={scopeHotelId}
            onChange={(e) => setScopeHotelId(e.target.value)}
          >
            <option value="">All hotels (platform)</option>
            {hotelOptions.map((h) => (
              <option key={hotelKey(h)} value={hotelKey(h)}>
                {h.name || h.email || hotelKey(h)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadSummary}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
          <button type="button" onClick={loadSummary} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg ml-3 shrink-0">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-8">
        {loading
          ? PLATFORM_METRICS.map((m) => (
              <div key={m.key} className="bg-white border border-slate-200 rounded-xl p-5 min-h-[120px] animate-pulse">
                <div className="h-3 w-20 bg-slate-100 rounded mb-3" />
                <div className="h-7 w-14 bg-slate-100 rounded" />
              </div>
            ))
          : cards.map((stat) => (
              <div key={stat.key} className="bg-white border border-slate-200 rounded-xl p-5 min-h-[120px]">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                  {stat.label}
                </p>
                <p className={`text-[26px] font-bold leading-none tracking-tight ${stat.alert && Number(stat.raw) > 0 ? "text-red-600" : "text-slate-900"}`}>
                  {stat.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">{stat.why}</p>
              </div>
            ))}
      </div>

      {scopeHotelId && (
        <section className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Hotel dashboard metrics</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                From <code className="bg-slate-50 px-1 rounded">/analytics/dashboard/:hotelId</code>
              </p>
            </div>
            <Link
              to="/dashboard/hotels"
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Open hotels directory
            </Link>
          </div>

          {hotelError && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {hotelError}
            </div>
          )}

          {hotelLoading ? (
            <p className="text-sm text-slate-500">Loading hotel metrics…</p>
          ) : hotelMetrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Employees", hotelMetrics.totalEmployees],
                ["On shift", hotelMetrics.onShift],
                ["Attendance rate", hotelMetrics.attendanceRate != null ? `${hotelMetrics.attendanceRate}%` : "—"],
                ["Compliance", hotelMetrics.complianceScore != null ? `${hotelMetrics.complianceScore}%` : "—"],
                ["Fatigue alerts", hotelMetrics.fatigueAlerts],
                ["Active SOS", hotelMetrics.activeSOS],
                ["Efficiency (OPH)", hotelMetrics.efficiency],
                ["Pending tasks", hotelMetrics.pendingTasks],
                ["Open jobs", hotelMetrics.activeJobOpenings],
                ["Certified staff", hotelMetrics.certifiedStaff],
                ["Pending certs", hotelMetrics.pendingCertification],
                ["Expired certs", hotelMetrics.expiredCertificates],
                ["HES violations", hotelMetrics.hesViolationCount],
              ].map(([label, value]) => (
                <div key={label} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {value === null || value === undefined ? "—" : typeof value === "number" ? value.toLocaleString("en-IN") : value}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No hotel dashboard data returned.</p>
          )}
        </section>
      )}

      <p className="mt-6 text-xs text-slate-400 leading-relaxed max-w-3xl">
        Note: The analytics summary endpoint is currently mounted without admin auth middleware in the backend.
        The UI still requires a valid platform-admin session to reach this page. Do not treat missing backend auth as intentional product design.
      </p>
    </div>
  )
}
