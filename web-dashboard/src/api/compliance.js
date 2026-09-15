import api from "./api"

/**
 * Platform-level compliance overview across hotels.
 * Backend: GET /compliance/reports  (MENDADMIN / SUPER_ADMIN)
 */
export async function getComplianceReports(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
  const res = await api.get("/compliance/reports", { params: cleaned })
  const body = res.data ?? {}
  const payload = body.data ?? {}
  const reports = Array.isArray(payload)
    ? payload
    : payload.reports ?? payload.items ?? payload.data ?? []

  return {
    reports,
    pagination: body.meta ?? {
      page: Number(cleaned.page) || 1,
      limit: Number(cleaned.limit) || 20,
      total: reports.length,
    },
  }
}

/**
 * Single hotel compliance report.
 * Backend: GET /compliance/report?hotelId=
 */
export async function getHotelComplianceReport(hotelId) {
  const res = await api.get("/compliance/report", { params: { hotelId } })
  return res.data?.data ?? null
}

/**
 * Trigger compliance re-evaluation for a hotel.
 * Backend: POST /compliance/evaluate  (body/query depends on controller)
 */
export async function evaluateCompliance(payload = {}) {
  const res = await api.post("/compliance/evaluate", payload, {
    params: payload.hotelId ? { hotelId: payload.hotelId } : undefined,
  })
  return res.data?.data ?? res.data
}
