import { useCallback } from "react"
import { getComplianceReports, getHotelComplianceReport } from "../../api/compliance"
import { getHotels, hotelKey } from "../../api/hotels"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody, CardHeader } from "../../components/ui/Card"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import { ErrorState } from "../../components/ui/States"
import { IconRefresh, IconCompliance } from "../../components/ui/Icons"
import { formatDateTime, formatValue } from "../../utils/format"

/**
 * Platform-wide certification view: which hotels are compliant, which are
 * blocked from hiring, and the latest evaluation detail per tenant.
 */
function tierTone(level) {
  const l = String(level || "").toUpperCase()
  if (l.includes("GOLD")) return "warning"
  if (l.includes("CERTIF") || l === "GOLD" || l === "PLATINUM") return "success"
  if (l === "NONE" || !l) return "neutral"
  return "info"
}

export default function CompliancePage() {
  const [q, setQ] = useUrlState({ hotel: "", page: 1, limit: 20 })

  const loadReports = useCallback(async () => {
    const result = await getComplianceReports({ page: q.page, limit: q.limit })
    return result
  }, [q.page, q.limit])
  const { data, loading, error, reload } = useAsyncData(loadReports)

  const loadHotels = useCallback(() => getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" }), [])
  const { data: hotelData } = useAsyncData(loadHotels)
  const hotels = hotelData?.hotels ?? []

  const loadDetail = useCallback(async () => {
    if (!q.hotel) return null
    return getHotelComplianceReport(q.hotel)
  }, [q.hotel])
  const {
    data: detail,
    loading: detailLoading,
    error: detailError,
    reload: reloadDetail,
  } = useAsyncData(loadDetail, { deps: [q.hotel] })

  const reports = data?.reports ?? []
  const pagination = data?.pagination ?? { total: reports.length }
  const selectedName = hotels.find((h) => String(hotelKey(h)) === String(q.hotel))?.name

  const columns = [
    {
      key: "hotel",
      label: "Hotel",
      width: "15rem",
      render: (r) => (
        <span className="block min-w-0">
          <span className="block truncate font-medium text-slate-900">{r.hotelName || r.hotel?.name || String(r.hotelId ?? "—")}</span>
          <span className="block truncate text-[11px] text-slate-400">{r.hotelId ?? ""}</span>
        </span>
      ),
    },
    {
      key: "complianceScore",
      label: "Score",
      sortable: false,
      render: (r) => {
        const score = r.complianceScore
        const tone = score == null ? "text-slate-400" : score >= 90 ? "text-emerald-700" : score >= 70 ? "text-amber-700" : "text-red-600"
        return (
          <span className="flex items-center gap-2">
            <span className={`font-semibold tabular-nums ${tone}`}>{score != null ? `${score}%` : "—"}</span>
            {score != null && (
              <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 md:inline-block">
                <span
                  className={`block h-full rounded-full ${score >= 90 ? "bg-emerald-500" : score >= 70 ? "bg-amber-400" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, score)}%` }}
                />
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: "certificationLevel",
      label: "Certification",
      render: (r) => <StatusBadge tone={tierTone(r.certificationLevel)} dot={false}>{r.certificationLevel || "None"}</StatusBadge>,
    },
    {
      key: "isEligibleToHire",
      label: "Hiring",
      render: (r) =>
        r.isEligibleToHire === true ? (
          <StatusBadge tone="success">Eligible</StatusBadge>
        ) : r.isEligibleToHire === false ? (
          <StatusBadge tone="danger">Blocked</StatusBadge>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      key: "lastEvaluatedAt",
      label: "Evaluated",
      render: (r) => <span className="whitespace-nowrap text-slate-500">{formatDateTime(r.lastEvaluatedAt)}</span>,
    },
  ]

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Certification tier and hiring eligibility for every hotel, recomputed by the compliance engine."
        actions={
          <Button variant="secondary" size="sm" icon={<IconRefresh size={13} />} loading={loading} onClick={reload}>
            Refresh
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div>
          <DataTable
            columns={columns}
            rows={reports}
            keyField="hotelId"
            loading={loading}
            error={error && !data ? error : ""}
            onRetry={reload}
            pagination={{
              page: q.page,
              limit: q.limit,
              total: pagination.total ?? reports.length,
              totalPages: pagination.totalPages ?? (Math.ceil((pagination.total ?? reports.length) / q.limit) || 1),
              onPage: (p) => setQ({ page: p }, { resetPage: false }),
            }}
            onRowClick={(r) => setQ({ hotel: String(r.hotelId ?? "") }, { resetPage: false })}
            empty={{
              icon: <IconCompliance size={20} />,
              title: "No compliance reports yet",
              description: "Reports appear after the compliance engine evaluates a hotel's attendance, shift and certification data.",
            }}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Hotel report"
              subtitle={selectedName ? `Latest evaluation for ${selectedName}` : "Select a hotel row or pick one below"}
            />
            <CardBody>
              <label className="mb-3 block">
                <span className="sr-only">Choose hotel</span>
                <select
                  value={q.hotel}
                  onChange={(e) => setQ({ hotel: e.target.value }, { resetPage: false })}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                >
                  <option value="">Select hotel…</option>
                  {hotels.map((h) => (
                    <option key={hotelKey(h)} value={hotelKey(h)}>
                      {h.name || hotelKey(h)}
                    </option>
                  ))}
                </select>
              </label>

              {!q.hotel ? (
                <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-[13px] text-slate-400">
                  Choose a hotel to inspect its evaluation detail.
                </p>
              ) : detailLoading && !detail ? (
                <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
              ) : detailError ? (
                <ErrorState title="We couldn't load this report" message={detailError} onRetry={reloadDetail} compact />
              ) : detail ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Score</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">
                        {detail.complianceScore != null ? `${detail.complianceScore}%` : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-100">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Certification</p>
                      <p className="mt-1.5">
                        <StatusBadge tone={tierTone(detail.certificationLevel)} dot={false}>
                          {detail.certificationLevel || "None"}
                        </StatusBadge>
                      </p>
                    </div>
                  </div>

                  <dl className="divide-y divide-slate-100 text-[13px]">
                    {[
                      ["Hiring eligible", detail.isEligibleToHire],
                      ["HES violations", detail.hesViolationCount],
                      ["Shifts in window", detail.shiftCount],
                      ["Window (days)", detail.windowDays],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between gap-3 py-2">
                        <dt className="text-slate-500">{label}</dt>
                        <dd className="font-medium text-slate-800">
                          {typeof value === "boolean" ? value ? "Yes" : "No" : formatValue(value)}
                        </dd>
                      </div>
                    ))}
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="text-slate-500">Last evaluated</dt>
                      <dd className="font-medium text-slate-800">{formatDateTime(detail.lastEvaluatedAt)}</dd>
                    </div>
                  </dl>

                  {detail.breakdown != null && (
                    <div className="border-t border-slate-100 pt-3">
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Score breakdown</p>
                      <Breakdown value={detail.breakdown} />
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-slate-400">No report has been generated for this hotel yet.</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How to read this page" />
            <CardBody className="space-y-2 text-[13px] leading-relaxed text-slate-500">
              <p>
                <span className="font-medium text-slate-700">Eligible / Blocked</span> under “Hiring” gates whether the
                hotel may publish new job openings on the Mend gig marketplace.
              </p>
              <p>
                <span className="font-medium text-slate-700">Certification tier</span> reflects the hotel's sustained
                compliance score; it is recalculated by the platform after each evaluation.
              </p>
              <p>
                Re-running evaluations happens automatically in the backend — this console is deliberately read-only.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}

/** Render the (unknown-shaped) breakdown as readable rows instead of raw JSON. */
function Breakdown({ value }) {
  if (value === null || value === undefined) return null
  if (typeof value !== "object") return <p className="text-[13px] text-slate-700">{formatValue(value)}</p>

  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] text-slate-600 ring-1 ring-slate-100">
            {typeof item === "object" ? <Breakdown value={item} nested /> : formatValue(item)}
          </li>
        ))}
      </ul>
    )
  }

  const entries = Object.entries(value)
  const allPrimitive = entries.every(([, v]) => v === null || typeof v !== "object")

  if (allPrimitive) {
    return (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
            <dt className="truncate text-[11px] text-slate-500">{k}</dt>
            <dd className="shrink-0 text-[12px] font-semibold text-slate-800">
              {typeof v === "boolean" ? (v ? "Yes" : "No") : formatValue(v)}
            </dd>
          </div>
        ))}
      </dl>
    )
  }

  // nested object — compact tags for primitives, recurse for deeper values
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) =>
        v === null || typeof v !== "object" ? (
          <div key={k} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
            <span className="truncate text-[11px] text-slate-500">{k}</span>
            <span className="text-[12px] font-semibold text-slate-800">{formatValue(v)}</span>
          </div>
        ) : (
          <div key={k} className="rounded-lg border border-slate-100 p-2.5">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</p>
            <Breakdown value={v} />
          </div>
        )
      )}
    </div>
  )
}
