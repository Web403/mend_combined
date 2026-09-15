import { useState, useEffect, useCallback } from "react"
import { deleteUser, getUserProfile, getUsers, suspendUser, updateUser } from "../api/users"
import { getHotels, hotelKey } from "../api/hotels"
import { sendCredentials } from "../api/credentials"
import { getErrorMessage } from "../api/api"
import ConfirmModal from "../components/ConfirmModal"

const STATUS_OPTIONS = ["CREATED", "ACTIVE", "SUSPENDED"]
const EXP_OPTIONS = [
  "Less than 1 year",
  "1–2 years",
  "3–5 years",
  "5–10 years",
  "10+ years",
]
const AVAIL_OPTIONS = [
  "Weekdays",
  "Weekends",
  "Both weekdays & weekends",
  "Flexible / Any time",
]
const PROFESSION_OPTIONS = [
  "Captain", "Chef", "Waiter", "Bartender", "Hostess", "Management", "Student", "Other",
]
const ROLE_OPTIONS = ["ADMIN", "MANAGER", "EMPLOYEE", "HR", "STUDENT", "PROFESSIONAL"]
const AVATAR_PALETTES = [
  "bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700",
  "bg-pink-100 text-pink-700", "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700", "bg-red-100 text-red-700", "bg-sky-100 text-sky-700",
]

function avatarClass(id = "") {
  if (!id) return AVATAR_PALETTES[0]
  return AVATAR_PALETTES[id.charCodeAt(id.length - 1) % AVATAR_PALETTES.length]
}
function getInitials(u) {
  return ((u?.profile?.firstName?.[0] ?? "") + (u?.profile?.lastName?.[0] ?? "")).toUpperCase()
}
function getUserId(u) {
  return u?.id ?? u?._id
}
function getFullName(u) {
  return [u?.profile?.firstName, u?.profile?.lastName].filter(Boolean).join(" ") || u?.email || "User"
}
function formatDate(iso) {
  if (!iso) return "-"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}
function formatValue(value, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "number") return value.toLocaleString("en-IN")
  return value
}

const SEL = "text-xs px-2.5 py-1.5 pr-7 border border-slate-200 rounded-lg bg-white text-slate-600 cursor-pointer outline-none focus:border-blue-300 appearance-none"

function StatusBadge({ status }) {
  const cls = status === "ACTIVE"
    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : status === "INACTIVE"
    ? "bg-slate-100 text-slate-500 ring-slate-200"
    : "bg-amber-50 text-amber-700 ring-amber-200"
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${cls}`}>
      {status}
    </span>
  )
}
function PaymentBadge({ paid }) {
  return paid ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200">Paid</span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 ring-1 ring-red-200">Unpaid</span>
  )
}
function SortIcon({ col, sortBy, sortOrder }) {
  if (sortBy !== col) return <span className="ml-1 opacity-30 text-[10px]">↕</span>
  return <span className="ml-1 text-[10px] text-blue-500">{sortOrder === "asc" ? "↑" : "↓"}</span>
}
function PageBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`min-w-[32px] h-8 px-2 text-xs rounded-lg border transition font-medium ${active ? "border-blue-400 bg-blue-50 text-blue-600" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"}`}>
      {children}
    </button>
  )
}
function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
      {toast.type === "success"
        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
      }
      {toast.message}
    </div>
  )
}

export default function Users() {
  const [users, setUsers] = useState([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 25, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [status, setStatus] = useState("")
  const [profession, setProfession] = useState("")
  const [availability, setAvailability] = useState("")
  const [yearsOfExperience, setYearsOfExperience] = useState("")
  const [hotelId, setHotelId] = useState("")
  const [hotelOptions, setHotelOptions] = useState([])
  const [hotelsLoading, setHotelsLoading] = useState(false)
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState("desc")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)

  const [confirmTarget, setConfirmTarget] = useState(null) // { id, name }
  const [sending, setSending] = useState(false)
  const [toast, setToast] = useState(null)
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [selectedUser, setSelectedUser] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState("")
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [editRole, setEditRole] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [savingUser, setSavingUser] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1) }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    let ignore = false

    async function loadHotelOptions() {
      setHotelsLoading(true)
      try {
        const result = await getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" })
        if (!ignore) setHotelOptions(result.hotels ?? [])
      } catch {
        if (!ignore) setHotelOptions([])
      } finally {
        if (!ignore) setHotelsLoading(false)
      }
    }

    loadHotelOptions()
    return () => { ignore = true }
  }, [])

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const result = await getUsers({ page, limit, sortBy, sortOrder, status, profession, availability, yearsOfExperience, hotelId, search })
      setUsers(result.users)
      setPagination(result.pagination)
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load users."))
    } finally {
      setLoading(false)
    }
  }, [page, limit, sortBy, sortOrder, status, profession, availability, yearsOfExperience, hotelId, search])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const loadUserDetails = useCallback(async (userId) => {
    if (!userId) return
    setDetailLoading(true)
    setDetailError("")
    try {
      const profile = await getUserProfile(userId)
      setSelectedUser(profile)
      setEditRole(profile?.role || "")
      setEditStatus(profile?.status || "")
    } catch (e) {
      setDetailError(getErrorMessage(e, "Failed to load user profile."))
    } finally {
      setDetailLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedUserId) loadUserDetails(selectedUserId)
  }, [loadUserDetails, selectedUserId])

  function handleSort(key) {
    if (sortBy === key) setSortOrder((d) => (d === "asc" ? "desc" : "asc"))
    else { setSortBy(key); setSortOrder("asc") }
    setPage(1)
  }
  function clearFilters() {
    setSearchInput(""); setStatus(""); setProfession("")
    setAvailability(""); setYearsOfExperience(""); setHotelId(""); setPage(1)
  }
  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }
  function openUser(userId) {
    setSelectedUserId(userId)
    setSelectedUser(null)
    setDetailError("")
  }
  async function handleSendCredentials() {
    if (!confirmTarget) return
    setSending(true)
    try {
      await sendCredentials({ userId: confirmTarget.id })
      setConfirmTarget(null)
      showToast("success", `Credentials sent to ${confirmTarget.name}`)
    } catch (e) {
      setConfirmTarget(null)
      showToast("error", getErrorMessage(e, "Failed to send credentials."))
    } finally {
      setSending(false)
    }
  }

  async function handleSuspend() {
    if (!suspendTarget) return
    setActionLoading(true)
    try {
      const updated = await suspendUser(suspendTarget.id)
      setUsers((items) =>
        items.map((u) => (getUserId(u) === suspendTarget.id ? { ...u, ...updated, status: updated?.status || "SUSPENDED" } : u))
      )
      if (selectedUserId === suspendTarget.id) {
        setSelectedUser((cur) => (cur ? { ...cur, ...updated, status: updated?.status || "SUSPENDED" } : cur))
        setEditStatus(updated?.status || "SUSPENDED")
      }
      setSuspendTarget(null)
      showToast("success", "User suspended successfully")
    } catch (e) {
      showToast("error", getErrorMessage(e, "Failed to suspend user. Requires MENDADMIN."))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteUser(deleteTarget.id)
      setUsers((items) => items.filter((u) => getUserId(u) !== deleteTarget.id))
      setPagination((p) => ({ ...p, total: Math.max(0, (p.total || 0) - 1) }))
      if (selectedUserId === deleteTarget.id) {
        setSelectedUserId(null)
        setSelectedUser(null)
      }
      setDeleteTarget(null)
      showToast("success", "User deleted successfully")
      fetchUsers()
    } catch (e) {
      showToast("error", getErrorMessage(e, "Failed to delete user. Requires MENDADMIN."))
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSaveUserAdmin() {
    if (!selectedUser) return
    setSavingUser(true)
    try {
      const payload = {}
      if (editRole) payload.role = editRole
      if (editStatus) payload.status = editStatus
      const updated = await updateUser(getUserId(selectedUser), payload)
      setSelectedUser((cur) => ({ ...cur, ...updated }))
      setUsers((items) =>
        items.map((u) => (getUserId(u) === getUserId(selectedUser) ? { ...u, ...updated } : u))
      )
      showToast("success", "User updated successfully")
    } catch (e) {
      showToast("error", getErrorMessage(e, "Failed to update user. Requires MENDADMIN."))
    } finally {
      setSavingUser(false)
    }
  }

  const hasFilters = status || profession || availability || yearsOfExperience || hotelId || searchInput
  const start = (page - 1) * limit + 1
  const end = Math.min(page * limit, pagination.total)

  const columns = [
    { key: "name", label: "Name" }, { key: "email", label: "Email" },
    { key: "profession", label: "Profession" }, { key: "yearsOfExperience", label: "Experience" },
    { key: "availability", label: "Availability" }, { key: "status", label: "Status" },
    { key: "payment", label: "Payment" }, { key: "createdAt", label: "Joined" },
    { key: "actions", label: "" },
  ]

  return (
    <div>
      <Toast toast={toast} />
      <ConfirmModal
        open={!!confirmTarget}
        title="Send credentials"
        description={`Send login credentials to "${confirmTarget?.name}"? They will receive an email with their access details.`}
        confirmLabel="Send credentials"
        loading={sending}
        onConfirm={handleSendCredentials}
        onCancel={() => !sending && setConfirmTarget(null)}
      />
      <ConfirmModal
        open={!!suspendTarget}
        danger
        title="Suspend user"
        description={`Suspend "${suspendTarget?.name}"? They will lose access until reactivated by an administrator.`}
        confirmLabel="Suspend user"
        loading={actionLoading}
        onConfirm={handleSuspend}
        onCancel={() => !actionLoading && setSuspendTarget(null)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        danger
        title="Delete user"
        description={`Permanently delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete user"
        loading={actionLoading}
        onConfirm={handleDeleteUser}
        onCancel={() => !actionLoading && setDeleteTarget(null)}
      />
      <UserDrawer
        open={!!selectedUserId}
        user={selectedUser}
        loading={detailLoading}
        error={detailError}
        editRole={editRole}
        editStatus={editStatus}
        savingUser={savingUser}
        onEditRole={setEditRole}
        onEditStatus={setEditStatus}
        onSaveUser={handleSaveUserAdmin}
        onSuspend={() =>
          selectedUser &&
          setSuspendTarget({ id: getUserId(selectedUser), name: getFullName(selectedUser) })
        }
        onDelete={() =>
          selectedUser &&
          setDeleteTarget({ id: getUserId(selectedUser), name: getFullName(selectedUser) })
        }
        onClose={() => setSelectedUserId(null)}
        onRetry={() => loadUserDetails(selectedUserId)}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900 mb-0.5">Users</h1>
          <p className="text-sm text-slate-500">{loading ? "Loading..." : `${pagination.total} total users`}</p>
        </div>
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
          </svg>
          <input
            className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-50 transition"
            placeholder="Search name, email, city…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select className={SEL} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={profession} onChange={(e) => { setProfession(e.target.value); setPage(1) }}>
          <option value="">All professions</option>
          {PROFESSION_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={yearsOfExperience} onChange={(e) => { setYearsOfExperience(e.target.value); setPage(1) }}>
          <option value="">All experience</option>
          {EXP_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={availability} onChange={(e) => { setAvailability(e.target.value); setPage(1) }}>
          <option value="">All availability</option>
          {AVAIL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <select className={SEL} value={hotelId} onChange={(e) => { setHotelId(e.target.value); setPage(1) }}>
          <option value="">{hotelsLoading ? "Loading hotels..." : "All hotels"}</option>
          {hotelOptions.map((hotel) => (
            <option key={hotelKey(hotel)} value={hotelKey(hotel)}>
              {hotel.name || hotel.email || hotelKey(hotel)}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:border-slate-300 transition bg-white">
            Clear filters
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Show</span>
          <select className={SEL} value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1) }}>
            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
          <button onClick={fetchUsers} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg hover:bg-red-100 transition ml-3 shrink-0">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white relative">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {columns.map(({ key, label }) => (
                  <th key={key}
                    onClick={() => key !== "actions" && handleSort(key)}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-slate-500 border-b border-slate-200 select-none whitespace-nowrap transition-colors ${key !== "actions" ? "cursor-pointer hover:text-slate-700" : ""}`}>
                    {label}
                    {key !== "actions" && <SortIcon col={key} sortBy={sortBy} sortOrder={sortOrder} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && users.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">No users found for the current filters.</td></tr>
              )}
              {users.map((u) => {
                const userId = getUserId(u)
                const userName = getFullName(u)
                return (
                <tr key={userId} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  {/* Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${avatarClass(userId)}`}>
                        {getInitials(u)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate">{userName}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {[u.profile?.location?.city, u.profile?.location?.country].filter(Boolean).join(", ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 truncate max-w-[160px]" title={u.email}>{u.email}</td>
                  <td className="px-4 py-3 text-[13px] text-slate-700">{u.profession || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.yearsOfExperience || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{u.availability || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                  <td className="px-4 py-3"><PaymentBadge paid={u.initialPaymentDone} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => openUser(userId)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => setConfirmTarget({ id: userId, name: userName })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors whitespace-nowrap"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                        </svg>
                        Credentials
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {loading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-[#1A2F5E] rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Loading users…</span>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
        <p className="text-xs text-slate-500">
          {pagination.total === 0 ? "No results" : `${start}–${end} of ${pagination.total} users`}
        </p>
        <div className="flex gap-1">
          <PageBtn onClick={() => setPage(1)} disabled={page === 1}>«</PageBtn>
          <PageBtn onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</PageBtn>
          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
            let p
            if (pagination.totalPages <= 5) p = i + 1
            else if (page <= 3) p = i + 1
            else if (page >= pagination.totalPages - 2) p = pagination.totalPages - 4 + i
            else p = page - 2 + i
            return <PageBtn key={p} onClick={() => setPage(p)} active={p === page}>{p}</PageBtn>
          })}
          <PageBtn onClick={() => setPage((p) => p + 1)} disabled={page === pagination.totalPages}>›</PageBtn>
          <PageBtn onClick={() => setPage(pagination.totalPages)} disabled={page === pagination.totalPages}>»</PageBtn>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-slate-800 break-words">{formatValue(value)}</p>
    </div>
  )
}

function UserDrawer({
  open,
  user,
  loading,
  error,
  editRole,
  editStatus,
  savingUser,
  onEditRole,
  onEditStatus,
  onSaveUser,
  onSuspend,
  onDelete,
  onClose,
  onRetry,
}) {
  if (!open) return null

  const profile = user?.profile ?? {}
  const location = profile.location ?? {}
  const hasSkills = Array.isArray(user?.skills) && user.skills.length > 0
  const hasLanguages = Array.isArray(profile.languages) && profile.languages.length > 0

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <aside className="relative z-10 h-full w-full max-w-4xl bg-slate-50 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">User profile</p>
            <h2 className="text-xl font-bold text-slate-900 mt-1">{user ? getFullName(user) : "Loading user..."}</h2>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {user?.status ? <StatusBadge status={user.status} /> : null}
              {user?.role ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                  {user.role}
                </span>
              ) : null}
              {user ? <PaymentBadge paid={user.initialPaymentDone} /> : null}
              {user?.profession ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 ring-1 ring-slate-200">
                  {user.profession}
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition"
            aria-label="Close user profile"
          >
            X
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="bg-white border border-slate-200 rounded-xl p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-200 border-t-[#1A2F5E] rounded-full animate-spin" />
              Loading user profile...
            </div>
          )}

          {error && (
            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {error}
              <button onClick={onRetry} className="text-xs px-2.5 py-1 border border-red-300 rounded-lg hover:bg-red-100 transition ml-3 shrink-0">
                Retry
              </button>
            </div>
          )}

          {!loading && user && (
            <div className="space-y-5">
              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900">Administrative actions</h3>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={onSuspend}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      onClick={onDelete}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <label className="text-xs font-semibold text-slate-500">
                    Role
                    <select
                      className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      value={editRole}
                      onChange={(e) => onEditRole(e.target.value)}
                    >
                      <option value="">—</option>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-semibold text-slate-500">
                    Status
                    <select
                      className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      value={editStatus}
                      onChange={(e) => onEditStatus(e.target.value)}
                    >
                      <option value="">—</option>
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={onSaveUser}
                    disabled={savingUser}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white hover:bg-[#152549] disabled:opacity-60"
                  >
                    {savingUser ? "Saving…" : "Save changes"}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-3">
                  Updates call PUT /user/admin/users/:id (MENDADMIN). Backend remains the authority for authorization.
                </p>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Basic information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailRow label="First name" value={profile.firstName} />
                  <DetailRow label="Last name" value={profile.lastName} />
                  <DetailRow label="Email" value={user.email} />
                  <DetailRow label="Phone" value={user.phone ?? user.phoneNumber ?? profile.phoneNumber} />
                  <DetailRow label="Role" value={user.role} />
                  <DetailRow label="Department type" value={user.departmentType} />
                  <DetailRow label="Department role" value={user.departmentRole} />
                  <DetailRow label="Profession" value={user.profession} />
                  <DetailRow label="Experience" value={user.yearsOfExperience} />
                  <DetailRow label="Availability" value={user.availability} />
                  <DetailRow label="Status" value={user.status} />
                  <DetailRow label="Hotel ID" value={user.hotelId} />
                  <DetailRow label="Initial payment" value={user.initialPaymentDone ? "Done" : "Pending"} />
                  <DetailRow label="Payment id" value={user.paymentId} />
                  <DetailRow label="Joined" value={formatDate(user.createdAt)} />
                  <DetailRow label="Updated" value={formatDate(user.updatedAt)} />
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-4">Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DetailRow label="Address" value={location.address} />
                  <DetailRow label="City" value={location.city} />
                  <DetailRow label="State" value={location.state} />
                  <DetailRow label="Country" value={location.country} />
                  <DetailRow label="Pincode" value={location.pincode} />
                  <DetailRow label="Coordinates" value={location.codePointAttr ? `${location.codePointAttr.lat}, ${location.codePointAttr.lng}` : "-"} />
                </div>
              </section>

              {(hasSkills || hasLanguages || user?.bio || profile.bio) && (
                <section className="bg-white border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-slate-900 mb-4">Profile details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailRow label="Bio" value={user.bio ?? profile.bio} />
                    <DetailRow label="Languages" value={hasLanguages ? profile.languages.join(", ") : "-"} />
                    <DetailRow label="Skills" value={hasSkills ? user.skills.join(", ") : "-"} />
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
