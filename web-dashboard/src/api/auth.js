import api from "./api"

export async function adminLogin(payload) {
  const res = await api.post("/admin/login", payload)
  return res.data.data
}