import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { adminLogin, isAuthenticated, storeAdminSession } from "../../api/auth"
import { getErrorMessage } from "../../api/api"
import { IconErrorCircle } from "../../components/ui/Icons"

/**
 * Platform-admin sign-in (POST /admin/login — unchanged). Kept deliberately
 * quiet: it states who this console is for and nothing more.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleLogin(e) {
    e.preventDefault?.()
    if (!email.trim() || !password) {
      setError("Please enter both email and password.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const data = await adminLogin({ email: email.trim(), password })
      storeAdminSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        role: data.role,
        email: data.email || email.trim(),
      })
      navigate("/dashboard", { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, "Invalid credentials. Please try again."))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-900 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-lg font-bold text-white ring-1 ring-white/15">
            M
          </span>
          <h1 className="text-lg font-semibold text-white">Mend Admin</h1>
          <p className="mt-1 text-[13px] text-slate-400">Platform administration console</p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/5"
          noValidate
        >
          <div className="mb-4">
            <label htmlFor="login-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mendhospitality.in"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between">
              <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                aria-pressed={showPass}
                className="text-[11px] font-semibold text-brand-600 hover:text-brand-800"
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="login-password"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-700"
            >
              <IconErrorCircle size={14} className="mt-px shrink-0" />
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-800 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-5 text-center text-[11px] leading-relaxed text-slate-400">
            Access is restricted to Mend platform administrators.
            <br />
            Hotel operators should use the restaurant dashboard.
          </p>
        </form>
      </div>
    </div>
  )
}
