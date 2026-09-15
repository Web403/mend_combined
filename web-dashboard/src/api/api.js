import axios from "axios"

/**
 * Platform Admin API client.
 * Base URL can be overridden with VITE_API_BASE_URL (full prefix including /api/v1)
 * or VITE_API_URL (host only — /api/v1 is appended).
 */
function resolveBaseURL() {
  const explicit = import.meta.env.VITE_API_BASE_URL
  if (explicit) return String(explicit).replace(/\/$/, "")

  const host = import.meta.env.VITE_API_URL
  if (host) return `${String(host).replace(/\/$/, "")}/api/v1`

  return "http://localhost:3000/api/v1"
}

const api = axios.create({
  baseURL: resolveBaseURL(),
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  // Optional tenant scope for platform-admin tools that accept X-Hotel-Id
  const hotelId = localStorage.getItem("adminScopeHotelId")
  if (hotelId && !config.headers["X-Hotel-Id"]) {
    config.headers["X-Hotel-Id"] = hotelId
  }

  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    if (status === 401) {
      const keys = ["accessToken", "refreshToken", "adminRole", "adminEmail", "adminScopeHotelId"]
      keys.forEach((key) => localStorage.removeItem(key))

      const base = String(import.meta.env.BASE_URL || "/").replace(/\/$/, "")
      const loginPath = `${base}/`
      const path = window.location.pathname
      const atLogin = path === base || path === `${base}/` || path.endsWith("/login")
      if (!atLogin) {
        window.location.assign(loginPath)
      }
    }
    return Promise.reject(error)
  }
)

/** Normalize backend error messages for UI display. */
export function getErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data
  if (typeof data?.message === "string" && data.message.trim()) return data.message
  if (typeof data?.error === "string" && data.error.trim()) return data.error
  if (typeof error?.message === "string" && error.message && !error.message.startsWith("Request failed")) {
    return error.message
  }
  return fallback
}

export default api
