import api from "./api"

export async function adminLogin(payload) {
  const res = await api.post("/admin/login", payload)
  return res.data?.data ?? res.data
}

export function storeAdminSession(tokens) {
  if (!tokens?.accessToken) {
    throw new Error("Login response did not include an access token.")
  }
  localStorage.setItem("accessToken", tokens.accessToken)
  if (tokens.refreshToken) {
    localStorage.setItem("refreshToken", tokens.refreshToken)
  }
  if (tokens.role) {
    localStorage.setItem("adminRole", tokens.role)
  }
  if (tokens.email) {
    localStorage.setItem("adminEmail", tokens.email)
  }
}

export function clearAdminSession() {
  ;["accessToken", "refreshToken", "adminRole", "adminEmail", "adminScopeHotelId"].forEach((key) => {
    localStorage.removeItem(key)
  })
}

export function getAdminSession() {
  return {
    accessToken: localStorage.getItem("accessToken"),
    refreshToken: localStorage.getItem("refreshToken"),
    role: localStorage.getItem("adminRole"),
    email: localStorage.getItem("adminEmail"),
  }
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("accessToken"))
}
