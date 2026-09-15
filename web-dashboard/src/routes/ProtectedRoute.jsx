import { Navigate, useLocation } from "react-router-dom"
import { isAuthenticated } from "../api/auth"

export default function ProtectedRoute({ children }) {
  const location = useLocation()
  if (!isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }
  return children
}
