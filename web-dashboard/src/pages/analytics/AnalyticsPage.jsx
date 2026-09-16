import { useCallback } from "react"
import { Link } from "react-router-dom"
import { downloadAdminAnalyticsCsv, getAdminAnalyticsSummary, getHotelDashboard } from "../../api/analytics"
import { getHotels, hotelKey } from "../../api/hotels"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody, CardHeader } from "../../components/ui/Card"
import { ErrorState } from "../../components/ui/States"
import { CardSkeleton } from "../../components/ui/Skeleton"
import { IconDownload, IconRefresh } from "../../components/ui/Icons"
import { useToast } from "../../hooks/useToast"
/**
 * Every metric here exists because the platform API already reports it — each
 * card states why an admin cares. No invented trends (no historical endpoint).
 */
const PLATFORM_METRICS = [
  { key: "totalHotels", label: "Total hotels", why: "Tenants onboarded on the platform", group: "Organizations" },
  { key: "certifiedHotels", label: "Certified hotels", why: "Hotels meeting the certification threshold", group: "Organizations" },
  { key: "complianceScore", label: "Compliance score", why: "Average across hotels (%)", group: "Organizations", suffix: "%" },
  { key: "activeEmployees", label: "Active employees", why: "Staff accounts marked active platform-wide", group: "People" },
  { key: "activeManagers", label: "Active managers", why: "Manager accounts across hotels", group: "People" },
  { key: "attendanceToday", label: "Attendance today", why: "Check-ins recorded across hotels", group: "People" },
  { key: "fatigueAlerts", label: "Fatigue alerts", why: "Open fatigue-risk flags", group: "Safety", alert: true },
  { key: "sosIncidents", label: "SOS incidents", why: "Reported safety incidents", group: "Safety", alert: true },
  { key: "openJobs", label: "Open jobs", why: "Active recruitment listings", group: "Hiring" },
  { key: "newApplications", label: "New applications", why: "Recent candidate applications", group: "Hiring" },
]

const HOTEL_DASHBOARD_ROWS = [
  ["Employees", "totalEmployees"],
  ["On shift now", "onShift"],
  ["Attendance rate", "attendanceRate", "%"],
  ["Compliance score", "complianceScore", "%"],
  ["Fatigue alerts", "fatigueAlerts"],
  ["Active SOS", "activeSOS"],
  ["Efficiency (OPH)", "efficiency"],
  ["Pending tasks", "pendingTasks"],
  ["Open job postings", "activeJobOpenings"],
  ["Certified staff", "certifiedStaff"],
  ["Pending certification", "pendingCertification"],
  ["Expired certificates", "expiredCertificates"],
  ["HES violations", "hesViolationCount"],
]

export default function AnalyticsPage() {
  const toast = useToast()
  const [q, setQ] = useUrlState({ hotel: "" })

  const loadHotels = useCallback(() => getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" }), [])
  const { data: hotelData } = useAsyncData(loadHotels)
  const hotels = hotelData?.hotels ?? []

  const load = useCallback(async () => {
    return getAdminAnalyticsSummary(q.hotel ? { hotelId: q.hotel } : {})
  }, [q.hotel])
  const { data: summary = {}, loading, error, reload } = useAsyncData(load, { deps: [q.hotel] })

  const loadHotelDash = useCallback(async () => {
    if (!q.hotel) return null
    return getHotelDashboard(q.hotel)
  }, [q.hotel])
  const { data: hotelDash, loading: dashLoading, error: dashError, reload: reloadDash } = useAsyncData(loadHotelDash, {
    deps: [q.hotel],
  })

  const selectedHotel = hotels.find((h) => String(hotelKey(h)) === String(q.hotel))

  async function exportCsv() {
    try {
      const blob = await downloadAdminAnalyticsCsv(q.hotel ? { hotelId: q.hotel } : {})
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `mend-admin-analytics${q.hotel ? `-${q.hotel}` : ""}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("CSV export downloaded")
    } catch {
      toast.error("The export could not be generated. Try again.")
    }
  }

  const groups = PLATFORM_METRICS.reduce((acc, m) => {
    ;(acc[m.group] ??= []).push(m)
    return acc
  }, {})

  return (
    <div>
      <PageHeader
        title="Analytics"
        description={
          q.hotel
            ? `Platform metrics scoped to ${selectedHotel?.name || "the selected hotel"}`
            : "Platform-wide aggregates from the analytics summary endpoint"
        }
        actions={
          <>
            <select
              aria-label="Scope to a hotel"
              value={q.hotel}
              onChange={(e) => setQ({ hotel: e.target.value })}
              className="h-8 max-w-56 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium text-slate-600 outline-none focus:border-brand-400"
            >
              <option value="">All hotels (platform)</option>
              {hotels.map((h) => (
                <option key={hotelKey(h)} value={hotelKey(h)}>
                  {h.name || hotelKey(h)}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" icon={<IconRefresh size={13} />} loading={loading} onClick={reload}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" icon={<IconDownload size={13} />} onClick={exportCsv}>
              Export CSV
            </Button>
          </>
        }
      />

      {error && !summary ? (
        <ErrorState title="We couldn't load platform analytics" message={error} onRetry={reload} />
      ) : (
        <div className="space-y-6">
          {Object.entries(groups).map(([group, metrics]) => (
            <section key={group} aria-label={group}>
              <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group}</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {metrics.map((m) => {
                  const raw = summary?.[m.key]
                  const alerting = m.alert && Number(raw) > 0
                  return (
                    <Card key={m.key} className={`p-4 ${loading && !summary ? "opacity-60" : ""}`}>
                      {loading && !summary ? (
                        <CardSkeleton lines={2} />
                      ) : (
                        <>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{m.label}</p>
                          <p className={`mt-1.5 text-2xl font-bold leading-none tracking-tight ${alerting ? "text-red-600" : "text-slate-900"}`}>
                            {raw === null || raw === undefined || raw === ""
                              ? "—"
                              : typeof raw === "number"
                                ? `${raw.toLocaleString("en-IN")}${m.suffix ?? ""}`
                                : `${raw}${m.suffix ?? ""}`}
                          </p>
                          <p className="mt-1.5 text-[11px] leading-snug text-slate-400">
                            {alerting ? (
                              <span className="font-semibold text-red-600">Needs review · </span>
                            ) : Number(raw) === 0 && m.alert ? (
                              <span className="font-semibold text-emerald-600">All clear · </span>
                            ) : null}
                            {m.why}
                          </p>
                        </>
                      )}
                    </Card>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {q.hotel && (
        <Card className="mt-8">
          <CardHeader
            title={`Hotel operations snapshot · ${selectedHotel?.name || hotelKey(hotels[0])}`}
            subtitle="Tenant-level dashboard metrics, shown only when a hotel is selected above."
            actions={
              <Link to={`/dashboard/hotels/${q.hotel}`} className="text-xs font-semibold text-brand-600 no-underline hover:underline">
                Open hotel profile →
              </Link>
            }
          />
          <CardBody>
            {dashLoading && !hotelDash ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {HOTEL_DASHBOARD_ROWS.map(([label]) => (
                  <CardSkeleton key={label} lines={1} />
                ))}
              </div>
            ) : dashError ? (
              <ErrorState title="We couldn't load hotel metrics" message={dashError} onRetry={reloadDash} compact />
            ) : hotelDash?.metrics ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
                {HOTEL_DASHBOARD_ROWS.map(([label, key, suffix]) => {
                  const value = hotelDash.metrics[key]
                  return (
                    <div key={key} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {value === null || value === undefined
                          ? "—"
                          : typeof value === "number"
                            ? `${value.toLocaleString("en-IN")}${suffix ?? ""}`
                            : String(value)}
                      </p>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hotel dashboard data was returned for this hotel yet.</p>
            )}
          </CardBody>
        </Card>
      )}

      <p className="mt-6 max-w-3xl text-[11px] leading-relaxed text-slate-400">
        Metrics come from <span className="font-medium text-slate-500">GET /analytics/admin/summary</span> and the per-hotel
        dashboard endpoint; there is no historical series in the API, so no trends are charted. Compliance certification
        detail lives on the <Link to="/dashboard/compliance" className="font-medium text-brand-600 hover:underline">Compliance</Link> page.
      </p>
    </div>
  )
}
