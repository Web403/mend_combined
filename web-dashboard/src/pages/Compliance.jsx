import { useCallback, useEffect, useState } from "react"
import { getComplianceReports, getHotelComplianceReport } from "../api/compliance"
import { getHotels, hotelKey } from "../api/hotels"
import { getErrorMessage } from "../api/api"

function formatValue(value, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "number") return value.toLocaleString("en-IN")
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

function formatDate(value) {
  if (!value) return "—"
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return String(value)
  }
}

function tierTone(level) {
  const l = String(level || "").toUpperCase()
  if (l.includes("GOLD")) return "bg-amber-50 text-amber-800 ring-amber-200"
  if (l.includes("CERTIF")) return "bg-emerald-50 text-emerald-700 ring-emerald-200"
  return "bg-slate-100 text-slate-600 ring-slate-200"
}

export default function Compliance() {
  const [reports, setReports] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedHotelId, setSelectedHotelId] = useState("")
  const [hotelOptions, setHotelOptions] = useState([])
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const result = await getComplianceReports({ page, limit })
      setReports(result.reports ?? [])
      setPagination(result.pagination ?? { page, limit, total: 0 })
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load compliance reports. Requires MENDADMIN or SUPER_ADMIN."))
      setReports([])
    } finally {
      setLoading(false)
    }
  }, [page, limit])

  useEffect(() => {
    loadReports()
  }, [loadReports])

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

  async function loadDetail(hotelId) {
    if (!hotelId) {
      setDetail(null)
      return
    }
    setDetailLoading(true)
    setDetailError("")
    try {
      const report = await getHotelComplianceReport(hotelId)
      setDetail(report)
    } catch (e) {
      setDetail(null)
      setDetailError(getErrorMessage(e, "Failed to load hotel compliance report."))
    } finally {
      setDetailLoading(false)
    }
  }

  useEffect(() => {
    if (selectedHotelId) loadDetail(selectedHotelId)
  }, [selectedHotelId])

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / limit) || 1)

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-0.5">Compliance overview</h1>
          <p className="text-sm text-slate-500">
            Platform view of hotel certification and compliance scores from the compliance module.
          </p>
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center justify-between px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          <span>{error}</span>
          <button type="button" onClick={loadReports} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg ml-3 shrink-0">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white relative">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-800">All hotel reports</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Show</span>
              <select
                className="text-xs border border-slate-200 rounded-lg px-2 py-1"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value))
                  setPage(1)
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Hotel</th>
                  <th className="text-left px-4 py-3 font-semibold">Score</th>
                  <th className="text-left px-4 py-3 font-semibold">Certification</th>
                  <th className="text-left px-4 py-3 font-semibold">Hiring</th>
                  <th className="text-left px-4 py-3 font-semibold">Evaluated</th>
                </tr>
              </thead>
              <tbody>
                {!loading && reports.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No compliance reports found.
                    </td>
                  </tr>
                )}
                {reports.map((r, idx) => {
                  const id = r.hotelId || r.id || r._id || String(idx)
                  return (
                    <tr
                      key={id}
                      className="border-t border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                      onClick={() => setSelectedHotelId(String(r.hotelId || id))}
                    >
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {r.hotelName || r.hotel?.name || String(r.hotelId || "—")}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {r.complianceScore != null ? `${r.complianceScore}%` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${tierTone(r.certificationLevel)}`}>
                          {r.certificationLevel || "NONE"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {r.isEligibleToHire === true ? (
                          <span className="text-emerald-700 font-semibold">Eligible</span>
                        ) : r.isEligibleToHire === false ? (
                          <span className="text-red-600 font-semibold">Blocked</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(r.lastEvaluatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-sm text-slate-500">
              Loading reports…
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-slate-500">
              {pagination.total ? `${pagination.total} reports` : "No results"} · page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 h-8 text-xs rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 h-8 text-xs rounded-lg border border-slate-200 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl bg-white p-5 h-fit">
          <h2 className="text-sm font-bold text-slate-900 mb-3">Inspect hotel report</h2>
          <select
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg mb-4"
            value={selectedHotelId}
            onChange={(e) => setSelectedHotelId(e.target.value)}
          >
            <option value="">Select hotel…</option>
            {hotelOptions.map((h) => (
              <option key={hotelKey(h)} value={hotelKey(h)}>
                {h.name || hotelKey(h)}
              </option>
            ))}
            {/* Also allow free IDs from reports not in hotel list */}
          </select>

          {detailError && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {detailError}
            </div>
          )}

          {detailLoading ? (
            <p className="text-sm text-slate-500">Loading report…</p>
          ) : detail ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Score</p>
                  <p className="text-xl font-bold text-slate-900">
                    {detail.complianceScore != null ? `${detail.complianceScore}%` : "—"}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-[10px] uppercase font-semibold text-slate-400">Certification</p>
                  <p className="text-sm font-bold text-slate-900 mt-1">{detail.certificationLevel || "—"}</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
                  <dt className="text-slate-500">Hiring eligible</dt>
                  <dd className="font-medium text-slate-800">{formatValue(detail.isEligibleToHire)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
                  <dt className="text-slate-500">HES violations</dt>
                  <dd className="font-medium text-slate-800">{formatValue(detail.hesViolationCount)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
                  <dt className="text-slate-500">Shifts in window</dt>
                  <dd className="font-medium text-slate-800">{formatValue(detail.shiftCount)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 py-2">
                  <dt className="text-slate-500">Window (days)</dt>
                  <dd className="font-medium text-slate-800">{formatValue(detail.windowDays)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-2">
                  <dt className="text-slate-500">Last evaluated</dt>
                  <dd className="font-medium text-slate-800 text-right">{formatDate(detail.lastEvaluatedAt)}</dd>
                </div>
              </dl>
              {detail.breakdown && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Breakdown</p>
                  <pre className="text-[11px] bg-slate-50 border border-slate-100 rounded-lg p-3 overflow-x-auto text-slate-700">
                    {JSON.stringify(detail.breakdown, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">Select a hotel to view its latest compliance report.</p>
          )}
        </div>
      </div>
    </div>
  )
}
