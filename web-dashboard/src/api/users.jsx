import api from "./api"

const ADMIN_USERS_PATH = "/user/admin/users"
const ADMIN_USER_PATH = "/user/admin/user"

export async function getUsers(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined)
  )
  const res = await api.get(ADMIN_USERS_PATH, { params: cleaned })
  const d = res.data
  if (Array.isArray(d.data)) {
    return {
      users: d.data,
      pagination: d.pagination ?? {
        total: d.data.length,
        page: params.page ?? 1,
        limit: params.limit ?? 25,
        totalPages: Math.ceil(d.data.length / (params.limit ?? 25)),
      },
    }
  }
  return d.data
}

export async function getUserProfile(userId) {
  const res = await api.get(`${ADMIN_USER_PATH}/${userId}`)
  return res.data?.data ?? null
}
