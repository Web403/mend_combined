import { useCallback, useEffect, useMemo, useState } from "react"
import {
  clonePermissions,
  deletePermission,
  disablePermission,
  enablePermission,
  getHotelPermissions,
  getRbacAvailableOptions,
  upsertPermission,
} from "../api/rbac"
import { getHotels, hotelKey } from "../api/hotels"
import { getErrorMessage } from "../api/api"
import ConfirmModal from "../components/ConfirmModal"

const FALLBACK_ROLES = ["ADMIN", "MANAGER", "EMPLOYEE", "HR", "STUDENT", "PROFESSIONAL"]
const FALLBACK_RESOURCES = [
  "USERS", "ROSTER", "ATTENDANCE", "SHIFT", "GIGS", "BOOKINGS", "PAYMENTS",
  "REPORTS", "SETTINGS", "JOBS", "APPLICATIONS", "TASKS", "COURSES", "RBAC", "ADMINS", "AUDIT_LOG",
]
const FALLBACK_PERMISSIONS = [
  "VIEW_USERS", "CREATE_USERS", "EDIT_USERS", "DELETE_USERS", "ASSIGN_ROLES",
  "VIEW_ROSTER", "CREATE_ROSTER", "EDIT_ROSTER", "DELETE_ROSTER", "PUBLISH_ROSTER",
  "VIEW_ATTENDANCE", "MARK_ATTENDANCE", "EDIT_ATTENDANCE", "APPROVE_ATTENDANCE",
  "VIEW_SHIFT", "CREATE_SHIFT", "EDIT_SHIFT", "DELETE_SHIFT",
  "VIEW_GIGS", "CREATE_GIGS", "EDIT_GIGS", "DELETE_GIGS",
  "VIEW_BOOKINGS", "CREATE_BOOKINGS", "EDIT_BOOKINGS", "CANCEL_BOOKINGS",
  "VIEW_PAYMENTS", "PROCESS_PAYMENTS", "REFUND_PAYMENTS",
  "VIEW_REPORTS", "GENERATE_REPORTS",
  "VIEW_SETTINGS", "EDIT_SETTINGS",
  "VIEW_JOBS", "POST_JOBS", "EDIT_JOBS", "DELETE_JOBS", "VIEW_APPLICATIONS", "MANAGE_APPLICATIONS",
  "VIEW_TASKS", "CREATE_TASKS", "EDIT_TASKS", "DELETE_TASKS", "ASSIGN_TASKS",
  "VIEW_COURSES", "CREATE_COURSES", "EDIT_COURSES", "DELETE_COURSES", "ENROLL_COURSES",
  "MANAGE_RBAC", "MANAGE_ADMINS", "VIEW_AUDIT_LOG",
]

const emptyForm = {
  role: "MANAGER",
  resourceType: "USERS",
  permissions: [],
  departmentType: "",
  departmentRole: "",
  description: "",
}

function permId(item) {
  return item?.id || item?._id || ""
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div
      className={`fixed top-5 right-5 z-[70] px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
        toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {toast.message}
    </div>
  )
}

export default function Rbac() {
  const [hotelOptions, setHotelOptions] = useState([])
  const [hotelId, setHotelId] = useState("")
  const [options, setOptions] = useState({})
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [cloneForm, setCloneForm] = useState({ sourceRole: "MANAGER", targetRole: "ADMIN" })
  const [cloning, setCloning] = useState(false)
  const [filterRole, setFilterRole] = useState("")
  const [filterResource, setFilterResource] = useState("")

  const roles = options.roles?.length ? options.roles : FALLBACK_ROLES
  const resources = options.resourceTypes?.length ? options.resourceTypes : FALLBACK_RESOURCES
  const permissions = options.permissions?.length ? options.permissions : FALLBACK_PERMISSIONS
  const departmentTypes = options.departmentTypes ?? []
  const departmentRoles = options.departmentRoles ?? []

  function showToast(type, message) {
    setToast({ type, message })
    setTimeout(() => setToast(null), 4000)
  }

  useEffect(() => {
    let ignore = false
    ;(async () => {
      try {
        const [hotelsResult, opts] = await Promise.all([
          getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" }),
          getRbacAvailableOptions().catch(() => ({})),
        ])
        if (!ignore) {
          setHotelOptions(hotelsResult.hotels ?? [])
          setOptions(opts ?? {})
        }
      } catch (e) {
        if (!ignore) setError(getErrorMessage(e, "Failed to load RBAC setup data."))
      }
    })()
    return () => {
      ignore = true
    }
  }, [])

  const loadRules = useCallback(async () => {
    if (!hotelId) {
      setRules([])
      return
    }
    setLoading(true)
    setError("")
    try {
      const data = await getHotelPermissions(hotelId)
      setRules(Array.isArray(data) ? data : [])
    } catch (e) {
      setRules([])
      setError(
        getErrorMessage(
          e,
          "Failed to load permissions. MANAGE_RBAC permission is required on the backend for this hotel."
        )
      )
    } finally {
      setLoading(false)
    }
  }, [hotelId])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      if (filterRole && rule.role !== filterRole) return false
      if (filterResource && rule.resourceType !== filterResource) return false
      return true
    })
  }, [rules, filterRole, filterResource])

  function togglePermission(perm) {
    setForm((f) => {
      const set = new Set(f.permissions)
      if (set.has(perm)) set.delete(perm)
      else set.add(perm)
      return { ...f, permissions: Array.from(set) }
    })
  }

  function startEdit(rule) {
    setForm({
      role: rule.role || "MANAGER",
      resourceType: rule.resourceType || "USERS",
      permissions: Array.isArray(rule.permissions) ? [...rule.permissions] : [],
      departmentType: rule.departmentType || "",
      departmentRole: rule.departmentRole || "",
      description: rule.description || "",
    })
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!hotelId) {
      showToast("error", "Select a hotel first.")
      return
    }
    if (!form.role || !form.resourceType || form.permissions.length === 0) {
      showToast("error", "Role, resource type, and at least one permission are required.")
      return
    }
    setSaving(true)
    try {
      await upsertPermission(hotelId, {
        role: form.role,
        resourceType: form.resourceType,
        permissions: form.permissions,
        departmentType: form.departmentType || undefined,
        departmentRole: form.departmentRole || undefined,
        description: form.description.trim() || undefined,
      })
      showToast("success", "Permission rule saved.")
      setForm(emptyForm)
      await loadRules()
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to save permission rule."))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deletePermission(permId(confirmDelete))
      showToast("success", "Permission rule deleted.")
      setConfirmDelete(null)
      await loadRules()
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to delete permission rule."))
    } finally {
      setDeleting(false)
    }
  }

  async function handleToggleActive(rule) {
    try {
      if (rule.isActive === false) await enablePermission(permId(rule))
      else await disablePermission(permId(rule))
      await loadRules()
      showToast("success", rule.isActive === false ? "Rule enabled." : "Rule disabled.")
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to update rule status."))
    }
  }

  async function handleClone() {
    if (!hotelId) return
    if (!cloneForm.sourceRole || !cloneForm.targetRole) {
      showToast("error", "Source and target roles are required.")
      return
    }
    if (cloneForm.sourceRole === cloneForm.targetRole) {
      showToast("error", "Source and target roles must differ.")
      return
    }
    setCloning(true)
    try {
      const result = await clonePermissions(hotelId, cloneForm)
      const count = typeof result === "number" ? result : result?.count ?? result?.cloned
      showToast("success", count != null ? `Cloned ${count} permission rule(s).` : "Permissions cloned.")
      await loadRules()
    } catch (err) {
      showToast("error", getErrorMessage(err, "Failed to clone permissions."))
    } finally {
      setCloning(false)
    }
  }

  return (
    <div>
      <Toast toast={toast} />
      <ConfirmModal
        open={!!confirmDelete}
        danger
        title="Delete permission rule"
        description={`Permanently delete the ${confirmDelete?.role} → ${confirmDelete?.resourceType} rule? This cannot be undone.`}
        confirmLabel="Delete rule"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDelete(null)}
      />

      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 mb-0.5">Access control (RBAC)</h1>
        <p className="text-sm text-slate-500 max-w-3xl">
          Manage hotel-scoped permission rules. Mutations require the backend{" "}
          <code className="text-xs bg-slate-100 px-1 rounded">MANAGE_RBAC</code> permission for the
          authenticated principal. Platform admins without hotel-scoped RBAC grants may only view
          options or receive 403 from the API.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <label className="text-xs font-semibold text-slate-500">
          Hotel / tenant
          <select
            className="mt-1 block min-w-[240px] text-sm px-3 py-2 border border-slate-200 rounded-lg bg-white"
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
          >
            <option value="">Select hotel…</option>
            {hotelOptions.map((h) => (
              <option key={hotelKey(h)} value={hotelKey(h)}>
                {h.name || hotelKey(h)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={loadRules}
          disabled={!hotelId || loading}
          className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Refresh rules"}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {!hotelId ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          Select a hotel to inspect and manage its RBAC rules.
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
          <div className="space-y-5">
            <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Upsert permission rule</h2>
              <p className="text-xs text-slate-500">
                Creates or updates the rule matching role + resource (+ optional department).
              </p>

              <label className="block text-xs font-semibold text-slate-500">
                Role
                <select
                  className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-semibold text-slate-500">
                Resource type
                <select
                  className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                  value={form.resourceType}
                  onChange={(e) => setForm({ ...form, resourceType: e.target.value })}
                >
                  {resources.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              {departmentTypes.length > 0 && (
                <label className="block text-xs font-semibold text-slate-500">
                  Department type (optional)
                  <select
                    className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                    value={form.departmentType}
                    onChange={(e) => setForm({ ...form, departmentType: e.target.value })}
                  >
                    <option value="">Any / not set</option>
                    {departmentTypes.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {departmentRoles.length > 0 && (
                <label className="block text-xs font-semibold text-slate-500">
                  Department role (optional)
                  <select
                    className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                    value={form.departmentRole}
                    onChange={(e) => setForm({ ...form, departmentRole: e.target.value })}
                  >
                    <option value="">Any / not set</option>
                    {departmentRoles.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Permissions ({form.permissions.length} selected)
                </p>
                <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg p-2 grid grid-cols-1 gap-1">
                  {permissions.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-xs text-slate-700 px-1 py-0.5 hover:bg-slate-50 rounded">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(p)}
                        onChange={() => togglePermission(p)}
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>

              <label className="block text-xs font-semibold text-slate-500">
                Description
                <input
                  className="mt-1 w-full text-sm px-3 py-2 border border-slate-200 rounded-lg"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional note"
                />
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold rounded-lg bg-[#1A2F5E] text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save rule"}
                </button>
                <button
                  type="button"
                  onClick={() => setForm(emptyForm)}
                  className="px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-600"
                >
                  Reset
                </button>
              </div>
            </form>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Clone role permissions</h2>
              <p className="text-xs text-slate-500">
                Copies active rules from one role to another for this hotel.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  From
                  <select
                    className="mt-1 w-full text-sm px-2 py-2 border border-slate-200 rounded-lg"
                    value={cloneForm.sourceRole}
                    onChange={(e) => setCloneForm({ ...cloneForm, sourceRole: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-semibold text-slate-500">
                  To
                  <select
                    className="mt-1 w-full text-sm px-2 py-2 border border-slate-200 rounded-lg"
                    value={cloneForm.targetRole}
                    onChange={(e) => setCloneForm({ ...cloneForm, targetRole: e.target.value })}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                onClick={handleClone}
                disabled={cloning}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {cloning ? "Cloning…" : "Clone permissions"}
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden relative">
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center">
              <p className="text-sm font-semibold text-slate-800 mr-auto">
                Rules ({filteredRules.length}
                {filteredRules.length !== rules.length ? ` of ${rules.length}` : ""})
              </p>
              <select
                className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="">All roles</option>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <select
                className="text-xs px-2 py-1.5 border border-slate-200 rounded-lg"
                value={filterResource}
                onChange={(e) => setFilterResource(e.target.value)}
              >
                <option value="">All resources</option>
                {resources.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">Resource</th>
                    <th className="text-left px-4 py-3">Department</th>
                    <th className="text-left px-4 py-3">Permissions</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {!loading && filteredRules.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                        No permission rules for this hotel.
                      </td>
                    </tr>
                  )}
                  {filteredRules.map((rule) => (
                    <tr key={permId(rule)} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{rule.role}</td>
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{rule.resourceType}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {[rule.departmentType, rule.departmentRole].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {(rule.permissions || []).map((p) => (
                            <span
                              key={p}
                              className="inline-flex px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                        {rule.description && (
                          <p className="text-[11px] text-slate-400 mt-1">{rule.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1 ${
                            rule.isActive === false
                              ? "bg-slate-100 text-slate-500 ring-slate-200"
                              : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          }`}
                        >
                          {rule.isActive === false ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => startEdit(rule)}
                            className="text-xs font-semibold text-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(rule)}
                            className="text-xs font-semibold text-slate-600"
                          >
                            {rule.isActive === false ? "Enable" : "Disable"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(rule)}
                            className="text-xs font-semibold text-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center text-sm text-slate-500">
                Loading rules…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
