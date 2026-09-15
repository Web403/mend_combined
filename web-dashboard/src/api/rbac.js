import api from "./api"

function clean(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v !== undefined && v !== null)
  )
}

const unwrap = (res) => res.data?.data ?? res.data

/** Dropdown options: roles, permissions, resource types */
export async function getRbacAvailableOptions() {
  const data = unwrap(await api.get("/rbac/available-options"))
  return data ?? {}
}

/** All permission rules for a hotel */
export async function getHotelPermissions(hotelId) {
  const data = unwrap(await api.get(`/rbac/hotel/${hotelId}`))
  return Array.isArray(data) ? data : data?.items ?? data?.data ?? []
}

/** Permissions filtered by role / department */
export async function getPermissionsByRole(hotelId, params = {}) {
  const data = unwrap(await api.get(`/rbac/hotel/${hotelId}/role`, { params: clean(params) }))
  return Array.isArray(data) ? data : data?.items ?? []
}

/** Effective permissions for a role/dept combination */
export async function getUserEffectivePermissions(hotelId, params = {}) {
  return unwrap(await api.get(`/rbac/hotel/${hotelId}/user-permissions`, { params: clean(params) }))
}

/** Create or update a permission rule */
export async function upsertPermission(hotelId, payload) {
  return unwrap(await api.post(`/rbac/hotel/${hotelId}/permission`, payload))
}

export async function deletePermission(id) {
  return unwrap(await api.delete(`/rbac/permission/${id}`))
}

export async function disablePermission(id) {
  return unwrap(await api.patch(`/rbac/permission/${id}/disable`))
}

export async function enablePermission(id) {
  return unwrap(await api.patch(`/rbac/permission/${id}/enable`))
}

export async function clonePermissions(hotelId, payload) {
  return unwrap(await api.post(`/rbac/hotel/${hotelId}/clone-permissions`, payload))
}
