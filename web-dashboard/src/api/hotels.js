import api from "./api"

const ADMIN_HOTELS_PATH = "/hotel/admin/Hotels"

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
}

export async function getHotels(params = {}) {
  const cleaned = cleanParams(params)
  const res = await api.get(ADMIN_HOTELS_PATH, { params: cleaned })
  const d = res.data

  // Response: { success, message, data: { data: [...], pagination? } }
  const list = d.data?.data ?? d.data ?? []
  const pagination = d.data?.pagination ?? {
    total: list.length,
    page: params.page ?? 1,
    limit: params.limit ?? 25,
    totalPages: Math.ceil(list.length / (params.limit ?? 25)),
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
  const res = await api.patch(`${ADMIN_HOTELS_PATH}/${hotelId}/status`, { isActive })
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
