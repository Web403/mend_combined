import { useCallback, useEffect, useMemo, useState } from "react"
import {
  clonePermissions,
  deletePermission,
  disablePermission,
  enablePermission,
  getHotelPermissions,
  getRbacAvailableOptions,
  upsertPermission,
} from "../../api/rbac"
import { getHotels, hotelKey } from "../../api/hotels"
import { getErrorMessage } from "../../api/api"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody, CardHeader } from "../../components/ui/Card"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Dropdown from "../../components/ui/Dropdown"
import { EmptyState, ErrorState, InlineAlert } from "../../components/ui/States"
import { SearchInput, FilterSelect } from "../../components/ui/Toolbar"
import { SelectField, TextAreaField } from "../../components/ui/Field"
import { useToast } from "../../hooks/useToast"
import { IconRefresh, IconShieldKey } from "../../components/ui/Icons"

/**
 * Hotel-scoped permission rules. Mirrors the backend RBAC model without
 * pretending to be the authority: every mutation still goes through the API,
 * which enforces MANAGE_RBAC per hotel. Copy avoids endpoint jargon.
 */
export default function RbacPage() {
  const toast = useToast()
  const [q, setQ] = useUrlState({ hotel: "", role: "", resource: "", page: 1 })

  const loadSetup = useCallback(async () => {
    const [hotelsResult, opts] = await Promise.all([
      getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" }),
      getRbacAvailableOptions().catch(() => ({})),
    ])
    return { hotels: hotelsResult.hotels ?? [], options: opts ?? {} }
  }, [])
  const { data: setup, loading: setupLoading } = useAsyncData(loadSetup)

  const hotels = setup?.hotels ?? []
  const options = setup?.options ?? {}

  const roles = options.roles?.length ? options.roles : ["ADMIN", "MANAGER", "EMPLOYEE", "HR", "STUDENT", "PROFESSIONAL"]
  const resources = options.resourceTypes?.length
    ? options.resourceTypes
    : ["USERS", "ROSTER", "ATTENDANCE", "SHIFT", "GIGS", "BOOKINGS", "PAYMENTS", "REPORTS", "SETTINGS", "JOBS", "APPLICATIONS", "TASKS", "COURSES", "RBAC", "ADMINS", "AUDIT_LOG"]
  const permissions = options.permissions?.length ? options.permissions : []
  const departmentTypes = options.departmentTypes ?? []
  const departmentRoles = options.departmentRoles ?? []

  const [rules, setRules] = useState([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesError, setRulesError] = useState("")

  const loadRules = useCallback(async () => {
    if (!q.hotel) {
      setRules([])
      setRulesError("")
      return
    }
    setRulesLoading(true)
    setRulesError("")
    try {
      const data = await getHotelPermissions(q.hotel)
      setRules(Array.isArray(data) ? data : [])
    } catch (err) {
      setRules([])
      setRulesError(
        err?.response?.status === 403
          ? "This hotel's permission rules can only be read or changed by an account granted its RBAC management rights."
          : getErrorMessage(err, "We couldn't load this hotel's permission rules.")
      )
    } finally {
      setRulesLoading(false)
    }
  }, [q.hotel])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  const selectedHotel = hotels.find((h) => String(hotelKey(h)) === String(q.hotel))
  const [modal, setModal] = useState(null) // null | {rule} | {clone:true}
  const [confirm, setConfirm] = useState(null) // {kind:'delete'|'disable'|'enable', rule}
  const [busy, setBusy] = useState(false)

  const permId = (r) => r.id || r._id || ""

  const filtered = useMemo(
    () =>
      rules.filter((rule) => {
        if (q.role && rule.role !== q.role) return false
        if (q.resource && rule.resourceType !== q.resource) return false
        return true
      }),
    [rules, q.role, q.resource]
  )

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      if (confirm.kind === "delete") await deletePermission(permId(confirm.rule))
      if (confirm.kind === "disable") await disablePermission(permId(confirm.rule))
      if (confirm.kind === "enable") await enablePermission(permId(confirm.rule))
      toast.success(confirm.kind === "delete" ? "Rule deleted" : confirm.kind === "disable" ? "Rule disabled" : "Rule enabled")
      setConfirm(null)
      loadRules()
    } catch (err) {
      toast.error(getErrorMessage(err, "That change could not be applied."))
    } finally {
      setBusy(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "role",
        label: "Role",
        render: (r) => <Tag className="bg-brand-50 text-brand-700 ring-brand-200">{r.role}</Tag>,
      },
      { key: "resourceType", label: "Resource", render: (r) => <span className="font-medium text-slate-800">{r.resourceType}</span> },
      {
        key: "department",
        label: "Department scope",
        render: (r) =>
          r.departmentType || r.departmentRole ? (
            <span className="text-[12px] text-slate-500">{[r.departmentType, r.departmentRole].filter(Boolean).join(" / ")}</span>
          ) : (
            <span className="text-slate-400">All departments</span>
          ),
      },
      {
        key: "permissions",
        label: "Grants",
        render: (r) => {
          const list = r.permissions || []
          return (
            <div className="flex max-w-md flex-wrap items-center gap-1">
              {list.slice(0, 4).map((p) => (
                <span key={p} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-600">
                  {p}
                </span>
              ))}
              {list.length > 4 && <span className="text-[11px] font-medium text-slate-400">+{list.length - 4} more</span>}
              {list.length === 0 && <span className="text-[11px] text-slate-400">none</span>}
            </div>
          )
        },
      },
      {
        key: "status",
        label: "Status",
        render: (r) =>
          r.isActive === false ? <StatusBadge tone="neutral">Disabled</StatusBadge> : <StatusBadge tone="success">Active</StatusBadge>,
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (r) => (
          <div className="flex items-center justify-end gap-1">
            <Button size="xs" variant="secondary" onClick={() => setModal({ rule: r })}>
              Edit
            </Button>
            <Dropdown
              label={`More actions for ${r.role} → ${r.resourceType}`}
              items={[
                {
                  label: r.isActive === false ? "Enable rule" : "Disable rule",
                  onClick: () => setConfirm({ kind: r.isActive === false ? "enable" : "disable", rule: r }),
                },
                { label: "Delete rule", danger: true, separatorBefore: true, onClick: () => setConfirm({ kind: "delete", rule: r }) },
              ]}
            />
          </div>
        ),
      },
    ],
    []
  )

  return (
    <div>
      <PageHeader
        title="Access control"
        description="Permission rules decide which actions each role can perform inside a hotel. Changes apply to that tenant immediately."
        actions={
          <>
            <Button size="sm" variant="secondary" icon={<IconRefresh size={13} />} onClick={loadRules} disabled={!q.hotel || rulesLoading}>
              Reload rules
            </Button>
            <Button size="sm" variant="primary" disabled={!q.hotel || !selectedHotel} onClick={() => setModal({ rule: null })}>
              Add rule
            </Button>
          </>
        }
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-end gap-3 py-4">
          <label className="min-w-64 flex-1 sm:max-w-sm">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Hotel (tenant)</span>
            <select
              value={q.hotel}
              onChange={(e) => setQ({ hotel: e.target.value })}
              className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">{setupLoading ? "Loading hotels…" : "Select a hotel…"}</option>
              {hotels.map((h) => (
                <option key={hotelKey(h)} value={hotelKey(h)}>
                  {h.name || hotelKey(h)}
                </option>
              ))}
            </select>
          </label>
          {q.hotel && selectedHotel && (
            <p className="text-xs text-slate-500">
              Rules for <span className="font-semibold text-slate-700">{selectedHotel.name}</span>
            </p>
          )}
        </CardBody>
      </Card>

      {!q.hotel ? (
        <Card className="border-dashed">
          <EmptyState
            icon={<IconShieldKey size={20} />}
            title="Choose a hotel to manage its access rules"
            description="Mend's permission model is per-tenant: roles like Manager or Front-office exist inside each hotel separately, so rules are always edited in a hotel context."
          />
        </Card>
      ) : rulesError ? (
        <ErrorState title="We couldn't load these rules" message={rulesError} onRetry={loadRules} />
      ) : (
        <DataTable
          columns={columns}
          rows={filtered.slice((q.page - 1) * 25, q.page * 25)}
          keyField="_id"
          loading={rulesLoading}
          pagination={{
            page: q.page,
            limit: 25,
            total: filtered.length,
            totalPages: Math.ceil(filtered.length / 25) || 1,
            onPage: (p) => setQ({ page: p }, { resetPage: false }),
          }}
          footer={
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-2">
              <FilterSelect
                label="Filter by role"
                value={q.role}
                onChange={(v) => setQ({ role: v })}
                options={[{ value: "", label: "All roles" }, ...roles.map((r) => ({ value: r, label: r }))]}
              />
              <FilterSelect
                label="Filter by resource"
                value={q.resource}
                onChange={(v) => setQ({ resource: v })}
                options={[{ value: "", label: "All resources" }, ...resources.map((r) => ({ value: r, label: r }))]}
              />
              {(q.role || q.resource) && (
                <button
                  type="button"
                  className="text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline"
                  onClick={() => setQ({ role: "", resource: "" })}
                >
                  Clear filters
                </button>
              )}
              <span className="ml-auto text-[11px] text-slate-400">
                {filtered.length === rules.length ? `${rules.length} rules` : `${filtered.length} of ${rules.length} rules`}
              </span>
              <Button
                size="xs"
                variant="secondary"
                onClick={() => setModal({ clone: true })}
              >
                Copy role → role
              </Button>
            </div>
          }
          empty={{
            title: "No permission rules for this hotel",
            description:
              filtered.length === 0 && rules.length > 0
                ? "Your current filters hide all rules — clear them to see the full set."
                : "Add a rule to grant a role access to a resource, or copy an existing role's setup.",
            action:
              filtered.length === 0 && rules.length === 0 ? (
                <Button size="sm" variant="primary" onClick={() => setModal({ rule: null })}>
                  Add the first rule
                </Button>
              ) : undefined,
          }}
        />
      )}

      {modal && !modal.clone && (
        <RuleModal
          rule={modal.rule}
          roles={roles}
          resources={resources}
          permissions={permissions}
          departmentTypes={departmentTypes}
          departmentRoles={departmentRoles}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null)
            toast.success(modal.rule ? "Rule updated" : "Rule saved")
            await loadRules()
          }}
          hotelId={q.hotel}
        />
      )}

      {modal?.clone && (
        <CloneModal
          roles={roles}
          onClose={() => setModal(null)}
          onCloned={async (count) => {
            setModal(null)
            toast.success(count != null ? `Copied ${count} rule${count === 1 ? "" : "s"}` : "Role permissions copied")
            await loadRules()
          }}
          hotelId={q.hotel}
        />
      )}

      <ConfirmDialog
        open={confirm?.kind === "delete"}
        danger
        title="Delete permission rule"
        description={`The ${confirm?.rule?.role} role will lose the granted access to ${confirm?.rule?.resourceType} for this hotel immediately.`}
        confirmLabel="Delete rule"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "disable"}
        danger
        title="Disable permission rule"
        description={`Everyone holding ${confirm?.rule?.role} instantly loses the ${confirm?.rule?.resourceType} access this rule grants. Data is untouched; re-enable any time.`}
        confirmLabel="Disable rule"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "enable"}
        title="Enable permission rule"
        description={`Grants access to all ${confirm?.rule?.role} accounts in this hotel again.`}
        confirmLabel="Enable rule"
        busy={busy}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

function RuleModal({ rule, roles, resources, permissions, departmentTypes, departmentRoles, hotelId, onClose, onSaved }) {
  const [form, setForm] = useState({
    role: rule?.role || "MANAGER",
    resourceType: rule?.resourceType || "USERS",
    permissions: Array.isArray(rule?.permissions) ? [...rule.permissions] : [],
    departmentType: rule?.departmentType || "",
    departmentRole: rule?.departmentRole || "",
    description: rule?.description || "",
  })
  const [permFilter, setPermFilter] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const visible = useMemo(
    () => permissions.filter((p) => !permFilter || p.toLowerCase().includes(permFilter.toLowerCase())),
    [permissions, permFilter]
  )

  function toggle(perm) {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter((p) => p !== perm) : [...f.permissions, perm],
    }))
  }

  async function save() {
    if (!form.role || !form.resourceType || form.permissions.length === 0) {
      setError("A role, a resource and at least one granted permission are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      await upsertPermission(hotelId, {
        role: form.role,
        resourceType: form.resourceType,
        permissions: form.permissions,
        departmentType: form.departmentType || undefined,
        departmentRole: form.departmentRole || undefined,
        description: form.description.trim() || undefined,
      })
      onSaved()
    } catch (err) {
      setError(getErrorMessage(err, "Could not save the rule. The backend rejected the change."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      size="lg"
      title={rule ? "Edit permission rule" : "Add permission rule"}
      description="One rule grants a role its allowed actions on one resource (optionally narrowed to a department)."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={save}>
            {rule ? "Save rule" : "Add rule"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField label="Role" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </SelectField>
          <SelectField label="Resource" value={form.resourceType} onChange={(e) => setForm((f) => ({ ...f, resourceType: e.target.value }))}>
            {resources.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </SelectField>
        </div>

        {(departmentTypes.length > 0 || departmentRoles.length > 0) && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {departmentTypes.length > 0 && (
              <SelectField
                label="Department type (optional)"
                value={form.departmentType}
                onChange={(e) => setForm((f) => ({ ...f, departmentType: e.target.value }))}
              >
                <option value="">Any department</option>
                {departmentTypes.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
            )}
            {departmentRoles.length > 0 && (
              <SelectField
                label="Department role (optional)"
                value={form.departmentRole}
                onChange={(e) => setForm((f) => ({ ...f, departmentRole: e.target.value }))}
              >
                <option value="">Any role in department</option>
                {departmentRoles.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </SelectField>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-600">
              Granted actions <span className="font-normal text-slate-400">({form.permissions.length} selected)</span>
            </p>
            <SearchInput value={permFilter} onChange={setPermFilter} placeholder="Filter actions…" className="w-44" label="Filter permissions" />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 p-2">
            {permissions.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-slate-400">
                The backend did not return a permission catalog for this deployment.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                {visible.map((p) => (
                  <label
                    key={p}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(p)}
                      onChange={() => toggle(p)}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-[var(--color-brand-800)]"
                    />
                    <span className="font-mono">{p}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          {visible.length > 0 && (
            <div className="mt-1.5 flex justify-end gap-3">
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-600 hover:underline"
                onClick={() => setForm((f) => ({ ...f, permissions: Array.from(new Set([...f.permissions, ...visible])) }))}
              >
                Select shown
              </button>
              <button
                type="button"
                className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
                onClick={() => setForm((f) => ({ ...f, permissions: f.permissions.filter((p) => !visible.includes(p)) }))}
              >
                Deselect shown
              </button>
            </div>
          )}
        </div>

        <TextAreaField
          label="Note for other admins"
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Optional — why this rule exists"
        />

        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

function CloneModal({ roles, hotelId, onClose, onCloned }) {
  const [form, setForm] = useState({ sourceRole: "MANAGER", targetRole: "ADMIN" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function clone() {
    if (!form.sourceRole || !form.targetRole) {
      setError("Pick both roles.")
      return
    }
    if (form.sourceRole === form.targetRole) {
      setError("Source and target roles must differ.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const result = await clonePermissions(hotelId, form)
      const count = typeof result === "number" ? result : result?.count ?? result?.cloned
      onCloned(count)
    } catch (err) {
      setError(getErrorMessage(err, "Could not copy the permissions."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Copy permissions between roles"
      description="Every active rule of the source role is applied to the target role as well — existing target rules for the same resources are overwritten."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={clone}>
            Copy rules
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SelectField label="From role" value={form.sourceRole} onChange={(e) => setForm((f) => ({ ...f, sourceRole: e.target.value }))}>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </SelectField>
        <SelectField label="To role" value={form.targetRole} onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}>
          {roles.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </SelectField>
      </div>
      {error && <p className="mt-3"><InlineAlert tone="danger">{error}</InlineAlert></p>}
    </Modal>
  )
}
