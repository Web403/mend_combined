import api from "./api"

const ADMIN_USERS_PATH = "/user/admin/users"
const ADMIN_USER_PATH = "/user/admin/user"

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
}

/**
 * List platform users.
 * Backend: GET /user/admin/users
 * Response: { success, data: User[], meta: { page, limit, total, totalPages } }
 */
export async function getUsers(params = {}) {
  const cleaned = cleanParams(params)
  const res = await api.get(ADMIN_USERS_PATH, { params: cleaned })
  const body = res.data ?? {}
  const users = Array.isArray(body.data)
    ? body.data
    : body.data?.users ?? body.data?.data ?? []

  const pagination = body.meta ?? body.pagination ?? body.data?.pagination ?? {
    total: users.length,
    page: Number(cleaned.page) || 1,
    limit: Number(cleaned.limit) || 25,
    totalPages: 1,
  }

  return { users, pagination }
}

export async function getUserProfile(userId) {
  const res = await api.get(`${ADMIN_USER_PATH}/${userId}`)
  return res.data?.data ?? null
}

export async function updateUser(userId, payload) {
  const res = await api.put(`${ADMIN_USERS_PATH}/${userId}`, payload)
  return res.data?.data ?? null
}

export async function suspendUser(userId) {
  const res = await api.patch(`${ADMIN_USERS_PATH}/${userId}/suspend`)
  return res.data?.data ?? null
}

export async function deleteUser(userId) {
  const res = await api.delete(`${ADMIN_USERS_PATH}/${userId}`)
  return res.data
}

export async function createAdminUser(payload) {
  const res = await api.post(ADMIN_USERS_PATH, payload)
  return res.data?.data ?? null
}
