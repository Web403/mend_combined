import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import ProtectedRoute from "./routes/ProtectedRoute";
import DashboardLayout from "./layouts/DashboardLayout";

// Dashboard Home
import DashboardHome from "./pages/dashboard/DashboardHome";

// Workforce
import Employees from "./pages/dashboard/workforce/Employees";
import Departments from "./pages/dashboard/workforce/Departments";
import Attendance from "./pages/dashboard/workforce/Attendance";
import Shifts from "./pages/dashboard/workforce/Shifts";

// Wellbeing
import EmployeeHealth from "./pages/dashboard/wellbeing/EmployeeHealth";
import FatigueAlerts from "./pages/dashboard/wellbeing/FatigueAlerts";

// SOS
import ActiveSOS from "./pages/dashboard/sos/ActiveSOS";
import Complaints from "./pages/dashboard/sos/Complaints";

// Tasks
import Tasks from "./pages/dashboard/tasks/Tasks";
import Performance from "./pages/dashboard/tasks/Performance";

// Compliance
import ComplianceScore from "./pages/dashboard/compliance/ComplianceScore";
import Audits from "./pages/dashboard/compliance/Audits";
import Certifications from "./pages/dashboard/compliance/Certifications";

// Recruitment
import JobOpenings from "./pages/dashboard/recruitment/JobOpenings";
import Candidates from "./pages/dashboard/recruitment/Candidates";

// Learning
import Courses from "./pages/dashboard/learning/Courses";
import Assessments from "./pages/dashboard/learning/Assessments";

// Reports
import AttendanceReports from "./pages/dashboard/reports/AttendanceReports";
import ComplianceReports from "./pages/dashboard/reports/ComplianceReports";
import Analytics from "./pages/dashboard/reports/Analytics";

// Settings
import HotelProfile from "./pages/dashboard/settings/HotelProfile";
import Geofence from "./pages/dashboard/settings/Geofence";
import RolesPermissions from "./pages/dashboard/settings/RolesPermissions";

const App = () => {
  return (
    <Routes>
      {/* Login */}
      <Route path="/" element={<Login />} />

      {/* Protected Dashboard */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard Home */}
        <Route index element={<DashboardHome />} />

        {/* Workforce */}
        <Route path="employees" element={<Employees />} />
        <Route path="departments" element={<Departments />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="shifts" element={<Shifts />} />

        {/* Wellbeing */}
        <Route path="employee-health" element={<EmployeeHealth />} />
        <Route path="fatigue-alerts" element={<FatigueAlerts />} />

        {/* SOS & Helpdesk */}
        <Route path="active-sos" element={<ActiveSOS />} />
        <Route path="complaints" element={<Complaints />} />

        {/* Tasks & Efficiency */}
        <Route path="tasks" element={<Tasks />} />
        <Route path="performance" element={<Performance />} />

        {/* Compliance */}
        <Route
          path="compliance-score"
          element={<ComplianceScore />}
        />
        <Route path="audits" element={<Audits />} />
        <Route
          path="certifications"
          element={<Certifications />}
        />

        {/* Recruitment */}
        <Route
          path="job-openings"
          element={<JobOpenings />}
        />
        <Route path="candidates" element={<Candidates />} />

        {/* Learning */}
        <Route path="courses" element={<Courses />} />
        <Route
          path="assessments"
          element={<Assessments />}
        />

        {/* Reports */}
        <Route
          path="attendance-reports"
          element={<AttendanceReports />}
        />
        <Route
          path="compliance-reports"
          element={<ComplianceReports />}
        />
        <Route path="analytics" element={<Analytics />} />

        {/* Settings */}
        <Route
          path="hotel-profile"
          element={<HotelProfile />}
        />
        <Route path="geofence" element={<Geofence />} />
        <Route
          path="roles-permissions"
          element={<RolesPermissions />}
        />
      </Route>
    </Routes>
  );
};

export default App;