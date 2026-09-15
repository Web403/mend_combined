import { useState } from "react"
import { Routes, Route } from "react-router-dom"
import Sidebar from "../components/Sidebar"
import Home from "./Home"
import Users from "./Users"
import Hotels from "./Hotels"
import Analytics from "./Analytics"
import Compliance from "./Compliance"
import Rbac from "./Rbac"
import LmsCategories from "./LmsCategories"
import LmsCourses from "./LmsCourses"
import LmsCourseContent from "./LmsCourseContent"
import LmsEnrollments from "./LmsEnrollments"
import LmsAssessments from "./LmsAssessments"

export default function Dashboard() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600"
            aria-label="Open menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-900">Mend Admin</p>
            <p className="text-[11px] text-slate-500">Platform console</p>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="compliance" element={<Compliance />} />
            <Route path="users" element={<Users />} />
            <Route path="hotels" element={<Hotels />} />
            <Route path="rbac" element={<Rbac />} />
            <Route path="lms/categories" element={<LmsCategories />} />
            <Route path="lms/courses" element={<LmsCourses />} />
            <Route path="lms/courses/:id" element={<LmsCourseContent />} />
            <Route path="lms/courses/:id/assessments" element={<LmsAssessments />} />
            <Route path="lms/enrollments" element={<LmsEnrollments />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
