import { useCallback, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { getAdminAnalyticsSummary } from "../../api/analytics"
import { getHotels } from "../../api/hotels"
import { getLmsCourses } from "../../api/lms"
import useAsyncData from "../../hooks/useAsyncData"
import Card, { CardHeader } from "../../components/ui/Card"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import StatusBadge from "../../components/ui/StatusBadge"
import { ErrorState } from "../../components/ui/States"
import Skeleton, { CardSkeleton } from "../../components/ui/Skeleton"
import {
  IconAlert,
  IconArrowRight,
  IconCheckCircle,
  IconHotel,
  IconRefresh,
} from "../../components/ui/Icons"
import { avatarTone, formatTime, getInitials } from "../../utils/format"
import { hotelStatusLabel } from "../../utils/labels"

/**
 * Overview = "what is happening across Mend?".
 * Only real data: the analytics summary endpoint, hotel directory counts,
 * the LMS catalog count, and the onboarding queue (unpaid hotels).
 * No invented trends; the full metric grid lives on the Analytics page.
 */
export default function OverviewPage() {
  const navigate = useNavigate()
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    const [summary, latest, unpaid, active, coursesAll, coursesPublished] = await Promise.all([
      getAdminAnalyticsSummary(),
      getHotels({ page: 1, limit: 5, sortBy: "createdAt", sortOrder: "desc" }),
      getHotels({ page: 1, limit: 5, initialPaymentDone: false, sortBy: "createdAt", sortOrder: "desc" }),
      getHotels({ page: 1, limit: 1, isActive: true }),
      getLmsCourses({ page: 1, limit: 1 }),
      getLmsCourses({ page: 1, limit: 1, status: "published" }),
    ])
    setLastUpdated(new Date())
    return {
      summary: summary ?? {},
      latest,
      unpaid,
      activeCount: active.pagination?.total ?? 0,
      courses: coursesAll.pagination?.total ?? coursesAll.items?.length ?? 0,
      published: coursesPublished.pagination?.total ?? coursesPublished.items?.length ?? 0,
    }
  }, [])

  const { data, loading, error, reload } = useAsyncData(load)

  const attention = useMemo(() => {
    if (!data) return []
    const s = data.summary
    const items = []
    const unpaidTotal = data.unpaid?.pagination?.total ?? 0
    if (Number(s.fatigueAlerts) > 0)
      items.push({
        key: "fatigue",
        tone: "warning",
        label: "Open fatigue alerts across hotels",
        value: `${s.fatigueAlerts}`,
        to: "/dashboard/analytics",
        action: "Review metrics",
      })
    if (Number(s.sosIncidents) > 0)
      items.push({
        key: "sos",
        tone: "danger",
        label: "Reported SOS incidents platform-wide",
        value: `${s.sosIncidents}`,
        to: "/dashboard/analytics",
        action: "Review metrics",
      })
    if (unpaidTotal > 0)
      items.push({
        key: "onboarding",
        tone: "warning",
        label: "Hotels with the onboarding payment pending",
        value: `${unpaidTotal}`,
        to: "/dashboard/hotels?payment=unpaid",
        action: "Review queue",
      })
    return items
  }, [data])

  const s = data?.summary ?? {}
  const score = typeof s.complianceScore === "number" ? Math.max(0, Math.min(100, s.complianceScore)) : null

  const snapshots = [
    {
      key: "orgs",
      label: "Organizations",
      icon: <IconHotel size={15} />,
      value: s.totalHotels,
      context: `${data?.activeCount ?? "—"} active tenants`,
      to: "/dashboard/hotels",
      cta: "Manage hotels",
      loading,
    },
    {
      key: "people",
      label: "People",
      value: s.activeEmployees,
      context: `${s.activeManagers ?? "—"} active manager accounts`,
      to: "/dashboard/users",
      cta: "Manage users",
      loading,
    },
    {
      key: "learning",
      label: "Learning",
      value: data?.courses,
      context: `${data?.published ?? "—"} published courses`,
      to: "/dashboard/learning/courses",
      cta: "Open catalog",
      loading,
    },
    {
      key: "compliance",
      label: "Compliance",
      value: score == null ? undefined : `${s.complianceScore}%`,
      context: `${s.certifiedHotels ?? "—"} of ${s.totalHotels ?? "—"} hotels certified`,
      bar: score,
      to: "/dashboard/compliance",
      cta: "Compliance reports",
      loading,
    },
  ]

  if (error && !data) {
    return (
      <div>
        <PageHeader title="Overview" description="Platform pulse across Mend" />
        <ErrorState title="We couldn't load the platform overview" message={error} onRetry={reload} />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        description={
          loading
            ? "Loading platform data…"
            : `Platform pulse across Mend${lastUpdated ? ` · updated ${formatTime(lastUpdated)}` : ""}`
        }
        actions={
          <Button variant="secondary" size="sm" icon={<IconRefresh size={13} />} loading={loading} onClick={reload}>
            Refresh
          </Button>
        }
      />

      {/* Needs attention — first because it's the most actionable */}
      <section aria-label="Needs attention" className="mb-6">
        {loading && !data ? (
          <Skeleton className="h-20 w-full rounded-xl" />
        ) : attention.length > 0 ? (
          <Card className="border-amber-200 bg-amber-50/40">
            <div className="flex items-center gap-2 border-b border-amber-100 px-5 py-3">
              <IconAlert size={14} className="text-amber-600" />
              <h2 className="text-sm font-semibold text-slate-900">Needs attention</h2>
              <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                {attention.length} item{attention.length > 1 ? "s" : ""}
              </span>
            </div>
            <ul>
              {attention.map((item) => (
                <li key={item.key} className="border-b border-amber-100/60 last:border-0">
                  <Link
                    to={item.to}
                    className="flex items-center gap-3 px-5 py-3 no-underline transition hover:bg-amber-100/40"
                  >
                    <StatusBadge tone={item.tone} dot={false}>
                      {item.value}
                    </StatusBadge>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-700">
                      {item.label}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-700">
                      {item.action} <IconArrowRight size={12} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5">
            <IconCheckCircle size={16} className="text-emerald-600" />
            <p className="text-[13px] font-medium text-emerald-800">
              Nothing needs attention — no open alerts and every tenant has completed onboarding.
            </p>
          </div>
        )}
      </section>

      {/* Platform snapshot */}
      <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        Platform snapshot
      </h2>
      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {snapshots.map((card) => (
          <SnapshotCard key={card.key} card={card} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        {/* Latest tenants */}
        <Card>
          <CardHeader
            title="Latest tenants"
            subtitle="The five most recently added hotels on the platform."
            actions={
              <Link
                to="/dashboard/hotels"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 no-underline hover:text-brand-800"
              >
                View all <IconArrowRight size={12} />
              </Link>
            }
          />
          {loading && !data ? (
            <div className="space-y-2 px-5 pb-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.latest?.hotels?.length ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {data.latest.hotels.map((h) => {
                const id = h.id || h._id
                const status = hotelStatusLabel(h.isActive)
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/hotels/${id}`)}
                      className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${avatarTone(id)}`}
                      >
                        {getInitials(h.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-slate-800">{h.name}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {[h.location?.city, h.location?.state].filter(Boolean).join(", ") || "Location not set"}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-xs text-slate-500 sm:block">{h.subscriptionPlan || "—"}</span>
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="border-t border-slate-100 px-5 py-8 text-center text-sm text-slate-400">
              No hotels on the platform yet. New tenants will appear here.
            </p>
          )}
        </Card>

        {/* Onboarding queue */}
        <Card>
          <CardHeader
            title="Onboarding queue"
            subtitle="Hotels created but with the onboarding payment still pending."
            actions={
              <Link
                to="/dashboard/hotels?payment=unpaid"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 no-underline hover:text-brand-800"
              >
                Review <IconArrowRight size={12} />
              </Link>
            }
          />
          {loading && !data ? (
            <div className="space-y-2 px-5 pb-5">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : data?.unpaid?.hotels?.length ? (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {data.unpaid.hotels.map((h) => {
                const id = h.id || h._id
                return (
                  <li key={id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/dashboard/hotels/${id}`}
                        className="block truncate text-[13px] font-medium text-slate-800 no-underline hover:text-brand-700"
                      >
                        {h.name}
                      </Link>
                      <span className="block truncate text-[11px] text-slate-400">{h.contactPersonName || h.email || "—"}</span>
                    </span>
                    <StatusBadge tone="warning">Payment due</StatusBadge>
                  </li>
                )
              })}
              {(data.unpaid.pagination?.total ?? 0) > data.unpaid.hotels.length && (
                <li className="px-5 py-2.5 text-[11px] text-slate-400">
                  + {data.unpaid.pagination.total - data.unpaid.hotels.length} more pending
                </li>
              )}
            </ul>
          ) : (
            <p className="border-t border-slate-100 px-5 py-8 text-center text-[13px] text-slate-400">
              All hotels have completed onboarding. Nothing pending.
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}

function SnapshotCard({ card }) {
  const value = card.value ?? "—"
  return (
    <Card className="relative flex min-h-[132px] flex-col justify-between p-4 transition hover:border-brand-300">
      {card.loading ? (
        <CardSkeleton lines={2} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{card.label}</p>
            {card.icon && (
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                {card.icon}
              </span>
            )}
          </div>
          <p className="mt-1 text-[26px] font-bold leading-none tracking-tight text-slate-900">
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </p>
          <p className="mt-1.5 text-[11px] text-slate-400">{card.context}</p>
          {typeof card.bar === "number" && (
            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${card.bar >= 90 ? "bg-emerald-500" : card.bar >= 70 ? "bg-amber-400" : "bg-red-500"}`}
                style={{ width: `${card.bar}%` }}
              />
            </div>
          )}
          <Link
            to={card.to}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 no-underline hover:text-brand-800"
          >
            {card.cta} <IconArrowRight size={12} />
          </Link>
        </>
      )}
    </Card>
  )
}
