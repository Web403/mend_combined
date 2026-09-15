import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { adminLogin } from "../api/auth"

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password.")
      return
    }
    setLoading(true)
    setError("")
    try {
      const data = await adminLogin({ email, password })
      localStorage.setItem("accessToken", data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      navigate("/dashboard")
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid credentials. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">

        {/* Logo */}
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-xl bg-[#1A2F5E] flex items-center justify-center text-white text-xl font-bold">
            A
          </div>
        </div>

        <h1 className="text-xl font-bold text-slate-900 text-center mb-1">Admin Portal</h1>
        <p className="text-sm text-slate-500 text-center mb-6">Sign in to your admin account</p>

        {/* Email */}
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

        {/* Password */}
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
              {showPass ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-2.5 mt-1 bg-[#1A2F5E] hover:bg-[#152549] text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </div>
    </div>
  )
}