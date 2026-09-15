// ─────────────────────────────────────────────────────────────────────────────
// src/components/ProtectedRoute.tsx
// Wraps any component that requires authentication.
// Shows a full-screen loader while session is being restored from localStorage,
// then redirects to LoginPage if not authenticated.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/LoginPage";

function FullPageSpinner() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F3] gap-3"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <svg
        className="animate-spin w-6 h-6 text-slate-400"
        viewBox="0 0 24 24"
        fill="none"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

interface Props {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <LoginPage />;

  return <>{children}</>;
}
