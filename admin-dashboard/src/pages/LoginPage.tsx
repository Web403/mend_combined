// ─────────────────────────────────────────────────────────────────────────────
// src/pages/LoginPage.tsx
// Admin login page for the Mend LMS Dashboard.
// Calls POST /api/v1/admin/login (MENDADMIN role).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface FormState {
  email: string;
  password: string;
}

interface FormErrors {
  email?: string;
  password?: string;
}

export default function LoginPage() {
  const { adminLogin } = useAuth();

  const [form, setForm] = useState<FormState>({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const set =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear field error on change
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
      if (serverError) setServerError("");
    };

  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.email.trim()) {
      e.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = "Enter a valid email address";
    }
    if (!form.password) {
      e.password = "Password is required";
    } else if (form.password.length < 6) {
      e.password = "Password must be at least 6 characters";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setServerError("");
    try {
      await adminLogin({ email: form.email.trim().toLowerCase(), password: form.password });
      // AuthContext sets user → App re-renders to dashboard
    } catch (err: any) {
      // Normalise error messages from the backend
      const msg: string = err?.response?.data?.message ?? err?.message ?? "Login failed";
      if (msg.toLowerCase().includes("credentials")) {
        setServerError("Incorrect email or password. Please try again.");
      } else if (msg.toLowerCase().includes("active")) {
        setServerError("Your account is inactive. Contact your administrator.");
      } else {
        setServerError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-[#F5F5F3] px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      {/* Card */}
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white mb-4 shadow-sm">
            <BookIcon />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mend Admin</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to manage your LMS</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            {/* Server error banner */}
            {serverError && (
              <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
                <svg className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <p className="text-sm text-red-700 leading-snug">{serverError}</p>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={form.email}
                onChange={set("email")}
                placeholder="admin@mendhospitality.in"
                className={`w-full px-4 py-3 rounded-xl border text-sm text-slate-900 bg-white outline-none transition-all
                  focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
                  ${errors.email ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}
              />
              {errors.email && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2"/></svg>
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={set("password")}
                  placeholder="••••••••"
                  className={`w-full px-4 py-3 pr-11 rounded-xl border text-sm text-slate-900 bg-white outline-none transition-all
                    focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
                    ${errors.password ? "border-red-400 bg-red-50" : "border-slate-200 hover:border-slate-300"}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12" stroke="white" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="white" strokeWidth="2"/></svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold
                hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors cursor-pointer mt-1"
            >
              {loading ? (
                <>
                  <SpinnerIcon />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Mend Hospitality Platform · Admin Access Only
        </p>
      </div>
    </div>
  );
}
