import { Navigate, useParams } from "react-router-dom"

/**
 * Old flat LMS URLs (and the retired per-screen content/assessment pages)
 * redirect into the new course-centric routes so bookmarks and any external
 * links keep working after the IA change.
 */
export function LegacyLmsRedirect({ tab, suffix = "" }) {
  const { id } = useParams()
  if (!id) return <Navigate to="/dashboard/learning/courses" replace />
  return <Navigate to={`/dashboard/learning/courses/${id}${suffix}${tab ? `?tab=${tab}` : ""}`} replace />
}
