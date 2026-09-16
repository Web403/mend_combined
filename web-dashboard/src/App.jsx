import { Navigate, Route, Routes } from "react-router-dom"
import LoginPage from "./pages/auth/LoginPage"
import ProtectedRoute from "./routes/ProtectedRoute"
import AppShell from "./components/layout/AppShell"
import { LegacyLmsRedirect } from "./routes/legacy.jsx"
import OverviewPage from "./pages/overview/OverviewPage"
import HotelsPage from "./pages/hotels/HotelsPage"
import HotelDetailPage from "./pages/hotels/HotelDetailPage"
import HotelFormPage from "./pages/hotels/HotelFormPage"
import UsersPage from "./pages/users/UsersPage"
import CoursesPage from "./pages/learning/CoursesPage"
import CourseFormPage from "./pages/learning/CourseFormPage"
import CourseDetailPage from "./pages/learning/CourseDetailPage"
import CategoriesPage from "./pages/learning/CategoriesPage"
import EnrollmentsPage from "./pages/learning/EnrollmentsPage"
import AnalyticsPage from "./pages/analytics/AnalyticsPage"
import CompliancePage from "./pages/compliance/CompliancePage"
import RbacPage from "./pages/rbac/RbacPage"

/**
 * Route map — mirrors routes/navigation.js (sidebar + breadcrumbs).
 * `hotels/new` before `hotels/:hotelId` keeps the literal path winning.
 */
function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<OverviewPage />} />

        <Route path="hotels" element={<HotelsPage />} />
        <Route path="hotels/new" element={<HotelFormPage />} />
        <Route path="hotels/:hotelId/edit" element={<HotelFormPage />} />
        <Route path="hotels/:hotelId" element={<HotelDetailPage />} />

        <Route path="users" element={<UsersPage />} />

        <Route path="learning/courses" element={<CoursesPage />} />
        <Route path="learning/courses/new" element={<CourseFormPage />} />
        <Route path="learning/courses/:courseId" element={<CourseDetailPage />} />
        <Route path="learning/categories" element={<CategoriesPage />} />
        <Route path="learning/enrollments" element={<EnrollmentsPage />} />

        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="compliance" element={<CompliancePage />} />
        <Route path="rbac" element={<RbacPage />} />

        {/* Legacy flat LMS screens → new course-centric routes */}
        <Route path="lms/categories" element={<Navigate to="/dashboard/learning/categories" replace />} />
        <Route path="lms/courses" element={<Navigate to="/dashboard/learning/courses" replace />} />
        <Route path="lms/enrollments" element={<Navigate to="/dashboard/learning/enrollments" replace />} />
        <Route path="lms/courses/:id" element={<LegacyLmsRedirect tab="content" />} />
        <Route path="lms/courses/:id/assessments" element={<LegacyLmsRedirect tab="assessments" />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
