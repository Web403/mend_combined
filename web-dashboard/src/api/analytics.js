import api from "./api"

/**
 * Platform-wide analytics summary.
 * Backend: GET /analytics/admin/summary
 * Optional hotelId scopes the summary to one hotel.
 */
export async function getAdminAnalyticsSummary(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
  const res = await api.get("/analytics/admin/summary", { params: cleaned })
  return res.data?.data ?? {}
}

/**
 * Download platform analytics as CSV (backend returns text/csv).
 */
export async function downloadAdminAnalyticsCsv(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
  const res = await api.get("/analytics/admin/summary", {
    params: { ...cleaned, format: "csv" },
    responseType: "blob",
  })
  return res.data
}

/**
 * Hotel-scoped operational dashboard metrics.
 * Backend: GET /analytics/dashboard/:hotelId
 * Used for inspecting a single tenant from the platform admin console.
 */
export async function getHotelDashboard(hotelId) {
  const res = await api.get(`/analytics/dashboard/${hotelId}`)
  return res.data?.data ?? null
}
