import api from "./api"

export async function sendCredentials({ userId, hotelId }) {
  const res = await api.post(`/admin/Send-Credentials?${userId ? `userId=${userId}` : `hotelId=${hotelId}`}`)
  return res.data
}