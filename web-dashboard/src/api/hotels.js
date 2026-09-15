import api from "./api"

const ADMIN_HOTELS_PATH = "/hotel/admin/Hotels"

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
}

/**
 * List hotels (tenants).
 * Backend: GET /hotel/admin/Hotels
 * Auth: SUPER_ADMIN
 * Response data: { data: Hotel[], pagination }
 */
export async function getHotels(params = {}) {
  const cleaned = cleanParams(params)
  // Booleans must be sent as strings for Express query parsing
  if (typeof cleaned.isActive === "boolean") cleaned.isActive = String(cleaned.isActive)
  if (typeof cleaned.initialPaymentDone === "boolean") {
    cleaned.initialPaymentDone = String(cleaned.initialPaymentDone)
  }

  const res = await api.get(ADMIN_HOTELS_PATH, { params: cleaned })
  const body = res.data ?? {}
  const payload = body.data

  let list = []
  let pagination = null

  if (Array.isArray(payload)) {
    list = payload
  } else if (payload && typeof payload === "object") {
    list = payload.data ?? payload.hotels ?? payload.items ?? []
    pagination = payload.pagination ?? null
  }

  pagination = pagination ?? body.meta ?? {
    total: list.length,
    page: Number(cleaned.page) || 1,
    limit: Number(cleaned.limit) || 25,
    totalPages: Math.ceil(list.length / (Number(cleaned.limit) || 25)) || 1,
  }

  return { hotels: list, pagination }
}

export async function getHotelProfile(hotelId) {
  const res = await api.get(`${ADMIN_HOTELS_PATH}/${hotelId}`)
  return res.data?.data ?? null
}

export async function createHotel(payload) {
  const res = await api.post(ADMIN_HOTELS_PATH, payload)
  return res.data?.data ?? null
}

export async function updateHotel(hotelId, payload) {
  const res = await api.put(`${ADMIN_HOTELS_PATH}/${hotelId}`, payload)
  return res.data?.data ?? null
}

export async function deleteHotel(hotelId) {
  const res = await api.delete(`${ADMIN_HOTELS_PATH}/${hotelId}`)
  return res.data
}

export async function updateHotelStatus(hotelId, isActive) {
  const res = await api.patch(`${ADMIN_HOTELS_PATH}/${hotelId}/status`, { isActive: Boolean(isActive) })
  return res.data?.data ?? null
}

export async function updateHotelSubscription(hotelId, payload) {
  const res = await api.patch(`${ADMIN_HOTELS_PATH}/${hotelId}/subscription`, payload)
  return res.data?.data ?? null
}

export async function getHotelAnalytics(hotelId) {
  const res = await api.get(`${ADMIN_HOTELS_PATH}/${hotelId}/analytics`)
  return res.data?.data ?? null
}

export async function createHotelUsers(hotelId, payload) {
  const res = await api.post(`${ADMIN_HOTELS_PATH}/${hotelId}/users`, payload)
  return res.data
}

export async function bulkUploadHotelUsers(hotelId, file) {
  const formData = new FormData()
  formData.append("file", file)

  const res = await api.post(`${ADMIN_HOTELS_PATH}/${hotelId}/users/bulk`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  })
  return res.data
}

export async function promoteHotelUser(hotelId, userId, payload) {
  const res = await api.patch(`${ADMIN_HOTELS_PATH}/${hotelId}/users/${userId}/promote`, payload)
  return res.data
}

/** Resolve the best hotel identifier for API path params (string id preferred). */
export function hotelKey(hotel) {
  if (!hotel) return ""
  return hotel.id || hotel._id || ""
}
