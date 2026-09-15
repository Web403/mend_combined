import { Routes, Route } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Home from "./Home"
import Users from "./Users"
import Hotels from "./Hotels"
import LmsCategories from "./LmsCategories"
import LmsCourses from "./LmsCourses"
import LmsCourseContent from "./LmsCourseContent"
import LmsEnrollments from "./LmsEnrollments"
import LmsAssessments from "./LmsAssessments"

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 min-w-0 p-7 overflow-x-hidden">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="users" element={<Users />} />
          <Route path="hotels" element={<Hotels />} />
          <Route path="lms/categories" element={<LmsCategories />} />
          <Route path="lms/courses" element={<LmsCourses />} />
          <Route path="lms/courses/:id" element={<LmsCourseContent />} />
          <Route path="lms/courses/:id/assessments" element={<LmsAssessments />} />
          <Route path="lms/enrollments" element={<LmsEnrollments />} />
        </Routes>
      </main>
    </div>
  )
}
