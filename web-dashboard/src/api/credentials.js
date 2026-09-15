import api from "./api"

/**
 * Send credentials email to a hotel or user.
 * Backend: POST /admin/Send-Credentials?hotelId= | ?userId=
 * Requires MENDADMIN role.
 */
export async function sendCredentials({ userId, hotelId }) {
  if (!userId && !hotelId) {
    throw new Error("Either userId or hotelId is required.")
  }
  const params = userId ? { userId } : { hotelId }
  const res = await api.post("/admin/Send-Credentials", null, { params })
  return res.data
}
