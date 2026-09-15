import api from "./api"

export async function getAdminAnalyticsSummary() {
  const res = await api.get("/analytics/admin/summary")
  return res.data?.data ?? {}
}
