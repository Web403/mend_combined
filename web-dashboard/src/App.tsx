import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/auth";
import { Shell } from "@/components/layout/shell";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { CategoriesPage } from "@/pages/categories";
import { CoursesPage } from "@/pages/courses";
import { CourseDetailPage } from "@/pages/course-detail";
import { EnrollmentsPage } from "@/pages/enrollments";
import { MyLearningPage } from "@/pages/my-learning";
import { LearnPage } from "@/pages/learn";
import { CertificatesPage } from "@/pages/certificates";
import type { Role } from "@/types/lms";

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, activeRole } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(activeRole ?? user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Shell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/categories"
            element={
              <ProtectedRoute roles={["admin"]}>
                <CategoriesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/slug/:slug" element={<CourseDetailPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/learn/:id" element={<LearnPage />} />
          <Route
            path="/enrollments"
            element={
              <ProtectedRoute roles={["admin", "EMPLOYEE", "learner"]}>
                <EnrollmentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-learning"
            element={
              <ProtectedRoute roles={["EMPLOYEE", "learner"]}>
                <MyLearningPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/certificates"
            element={
              <ProtectedRoute roles={["admin", "EMPLOYEE", "learner"]}>
                <CertificatesPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
