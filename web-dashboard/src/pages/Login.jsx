import { useState } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import { adminLogin, isAuthenticated, storeAdminSession } from "../api/auth"
import { getErrorMessage } from "../api/api"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  if (isAuthenticated()) {
    return <Navigate to="/dashboard" replace />
  }

  const handleLogin = async () => {
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#1A2F5E] flex items-center justify-center text-white text-xl font-bold">
            M
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 text-center mb-1">Mend Admin</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Platform administrator sign-in</p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Email address
          </label>
          <input
            type="email"
            placeholder="admin@example.com"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPass ? "text" : "password"}
              placeholder="Enter password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="w-full px-3 py-2.5 pr-10 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPass ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 mt-1 bg-[#1A2F5E] hover:bg-[#152549] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-5 text-[11px] text-center text-slate-400 leading-relaxed">
          Access is restricted to Mend platform administrators.
          Hotel operators should use the restaurant dashboard.
        </p>
      </div>
    </div>
  )
}
