import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  bulkUploadHotelUsers,
  createHotelUsers,
  deleteHotel,
  getHotelAnalytics,
  getHotelProfile,
  hotelKey,
  promoteHotelUser,
  updateHotelStatus,
  updateHotelSubscription,
} from "../../api/hotels"
import { getUsers } from "../../api/users"
import { sendCredentials } from "../../api/credentials"
import { getErrorMessage } from "../../api/api"
import useAsyncData from "../../hooks/useAsyncData"
import useDebouncedValue from "../../hooks/useDebouncedValue"
import useUrlState from "../../hooks/useUrlState"
import { ROOT_CRUMB } from "../../routes/navigation"
import { useSetCrumbs } from "../../components/layout/crumbs"
import PageHeader from "../../components/ui/PageHeader"
import Button, { LinkButton } from "../../components/ui/Button"
import Card, { CardBody, CardHeader, DetailGrid, DetailItem } from "../../components/ui/Card"
import { SelectField, TextField } from "../../components/ui/Field"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import Tabs, { TabPanel } from "../../components/ui/Tabs"
import DataTable from "../../components/ui/DataTable"
import Modal from "../../components/ui/Modal"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Dropdown from "../../components/ui/Dropdown"
import { SearchInput } from "../../components/ui/Toolbar"
import { ErrorState, InlineAlert } from "../../components/ui/States"
import { useToast } from "../../hooks/useToast"
import { IconEye, IconMail, IconPencil, IconUpload, IconUserPlus } from "../../components/ui/Icons"
import { avatarTone, formatDateTime, formatValue, getInitials } from "../../utils/format"
import { hotelStatusLabel, paymentLabel, subscriptionExpiry, subscriptionStatus, userStatus } from "../../utils/labels"
import {
  DEPARTMENT_ROLE_OPTIONS,
  DEPARTMENT_TYPE_OPTIONS,
  HOTEL_USER_ROLE_OPTIONS,
  PLAN_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
  compactHotelObject,
} from "./hotelOptions"

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "people", label: "People & access" },
  { id: "billing", label: "Subscription & onboarding" },
  { id: "operations", label: "Operations" },
]

export default function HotelDetailPage() {
  const { hotelId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useUrlState({ tab: "overview" })
  const tab = TABS.some((t) => t.id === q.tab) ? q.tab : "overview"

  const load = useCallback(async () => {
    const [profile, analytics] = await Promise.all([getHotelProfile(hotelId), getHotelAnalytics(hotelId).catch(() => null)])
    return { profile, analytics }
  }, [hotelId])

  const { data, loading, error, reload, runAction } = useAsyncData(load, { deps: [hotelId] })
  const hotel = data?.profile
  const analytics = data?.analytics

  useSetCrumbs(
    hotel ? [ROOT_CRUMB, { label: "Hotels", to: "/dashboard/hotels" }, { label: hotel.name }] : null
  )

  const [confirm, setConfirm] = useState(null) // {type: 'credentials'|'toggle'|'delete'}
  const [pending, setPending] = useState(false)

  async function runConfirmation() {
    if (!confirm || !hotel) return
    setPending(true)
    const id = hotelKey(hotel)
    const result = await runAction(async () => {
      if (confirm.type === "credentials") return sendCredentials({ hotelId: id })
      if (confirm.type === "delete") return deleteHotel(id)
      if (confirm.type === "toggle") return updateHotelStatus(id, !hotel.isActive)
    })
    setPending(false)
    if (result.ok) {
      if (confirm.type === "credentials") toast.success(`Credentials sent to ${hotel.name}`)
      if (confirm.type === "delete") {
        toast.success(`${hotel.name} deleted`)
        navigate("/dashboard/hotels")
        return
      }
      if (confirm.type === "toggle") {
        toast.success(`${hotel.name} ${hotel.isActive ? "deactivated" : "activated"}`)
        await reload()
      }
      setConfirm(null)
    }
  }

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Hotel profile" backLink={{ to: "/dashboard/hotels", label: "Hotels" }} />
        <div className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
      </div>
    )
  }

  if (error && !hotel) {
    return (
      <div>
        <PageHeader title="Hotel profile" backLink={{ to: "/dashboard/hotels", label: "Hotels" }} />
        <ErrorState
          title="We couldn't load this hotel"
          message={error}
          onRetry={reload}
        />
      </div>
    )
  }

  const status = hotelStatusLabel(hotel?.isActive)
  const sub = subscriptionStatus(hotel?.subscriptionStatus)
  const pay = paymentLabel(hotel?.initialPaymentDone)
  const expiry = subscriptionExpiry(hotel?.subscriptionExpiresAt)

  return (
    <div>
      <PageHeader
        title={hotel?.name || "Hotel"}
        backLink={{ to: "/dashboard/hotels", label: "Hotels" }}
        description={
          hotel
            ? [hotel.location?.city, hotel.location?.state, hotel.location?.country].filter(Boolean).join(" · ") ||
              "Location not set"
            : undefined
        }
        status={
          hotel && (
            <>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone="info" dot={false}>{hotel.subscriptionPlan || "No plan"}</StatusBadge>
              <StatusBadge tone={sub.tone}>{sub.label}</StatusBadge>
              <StatusBadge tone={pay.tone}>{pay.label}</StatusBadge>
            </>
          )
        }
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<IconMail size={13} />} onClick={() => setConfirm({ type: "credentials" })}>
              Send credentials
            </Button>
            <LinkButton size="sm" variant="primary" icon={<IconPencil size={13} />} to={`/dashboard/hotels/${hotelId}/edit`}>
              Edit hotel
            </LinkButton>
            <Dropdown
              label="Danger zone"
              items={[
                {
                  label: hotel?.isActive ? "Deactivate hotel" : "Activate hotel",
                  danger: Boolean(hotel?.isActive),
                  onClick: () => setConfirm({ type: "toggle" }),
                },
                { label: "Delete hotel", danger: true, separatorBefore: true, onClick: () => setConfirm({ type: "delete" }) },
              ]}
            />
          </>
        }
      />

      <div className="mb-4">
        <Tabs tabs={TABS} value={tab} onChange={(id) => setQ({ tab: id })} />
      </div>

      <TabPanel id="overview" active={tab === "overview"}>
        <OverviewTab hotel={hotel} analytics={analytics} expiryLabel={expiry.label} expiryTone={expiry.tone} />
      </TabPanel>

      <TabPanel id="people" active={tab === "people"}>
        <PeopleTab hotel={hotel} />
      </TabPanel>

      <TabPanel id="billing" active={tab === "billing"}>
        <BillingTab hotel={hotel} reload={reload} />
      </TabPanel>

      <TabPanel id="operations" active={tab === "operations"}>
        <OperationsTab hotel={hotel} analytics={analytics} />
      </TabPanel>

      <ConfirmDialog
        open={confirm?.type === "credentials"}
        title="Send login credentials"
        description={`An email with their access details will be sent to ${hotel?.name}. Use this deliberately — it emails the tenant password.`}
        confirmLabel="Send credentials"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "toggle"}
        danger={Boolean(hotel?.isActive)}
        title={hotel?.isActive ? "Deactivate hotel" : "Activate hotel"}
        description={
          hotel?.isActive
            ? `${hotel?.name} and all of its users will immediately lose platform access. Data is preserved and access can be restored by reactivating.`
            : `${hotel?.name} will regain platform access for all of its active users.`
        }
        confirmLabel={hotel?.isActive ? "Deactivate hotel" : "Activate hotel"}
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "delete"}
        danger
        requireText={hotel?.name}
        title="Delete hotel"
        description={`"${hotel?.name}" and its tenant record will be permanently removed — subscriptions, credentials and history included. This cannot be undone.`}
        confirmLabel="Delete hotel"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

/* ── Overview tab ─────────────────────────────────────────────────────────── */

function OverviewTab({ hotel, analytics, expiryLabel, expiryTone }) {
  const a = analytics ?? {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat label="Compliance score" value={a.complianceScore != null ? `${a.complianceScore}%` : "—"} sub={a.certificationStatus ?? "Certification pending"} />
        <MiniStat label="Users" value={a.employeeCount ?? hotel?.staffStrength ?? "—"} sub={a.managerCount != null ? `${a.managerCount} managers` : "Across this tenant"} />
        <MiniStat label="Open jobs" value={formatValue(a.openJobs)} sub={a.hiringEligibility === undefined ? "Hiring status unknown" : a.hiringEligibility ? "Eligible to hire" : "Hiring blocked"} tone={a.hiringEligibility === false ? "warning" : undefined} />
        <MiniStat label="Subscription" value={hotel?.subscriptionPlan ?? "—"} sub={expiryLabel} tone={expiryTone === "danger" ? "danger" : undefined} />
      </div>

      <Card>
        <CardHeader title="What you need to know about this organization" subtitle="Contact, property profile and the pain point Mend is onboarded to solve." />
        <CardBody>
          <DetailGrid cols={3}>
            <DetailItem label="Contact person" value={hotel?.contactPersonName} />
            <DetailItem label="Email" value={hotel?.email} />
            <DetailItem label="Phone" value={hotel?.phoneNumber} />
            <DetailItem label="Property type" value={hotel?.propertyType} />
            <DetailItem label="Primary pain point" value={hotel?.primaryPainPoint} />
            <DetailItem label="Monthly events" value={hotel?.monthlyEvents} />
            <DetailItem label="Staff strength" value={formatValue(hotel?.staffStrength)} />
            <DetailItem label="Platform ID" value={hotel?.id} />
            <DetailItem label="Active users" value={formatValue(analytics?.employeeCount)} />
          </DetailGrid>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Location" />
        <CardBody>
          <DetailGrid cols={3}>
            <DetailItem label="Address" value={hotel?.location?.address} className="lg:col-span-2" />
            <DetailItem label="City" value={hotel?.location?.city} />
            <DetailItem label="State" value={hotel?.location?.state} />
            <DetailItem label="Country" value={hotel?.location?.country} />
            <DetailItem label="Pincode" value={formatValue(hotel?.location?.pincode)} />
            <DetailItem
              label="Coordinates"
              value={hotel?.location?.codePointAttr ? `${hotel.location.codePointAttr.lat}, ${hotel.location.codePointAttr.lng}` : "—"}
            />
          </DetailGrid>
        </CardBody>
      </Card>
    </div>
  )
}

function MiniStat({ label, value, sub, tone }) {
  const toneCls = tone === "danger" ? "text-red-600" : tone === "warning" ? "text-amber-700" : "text-slate-900"
  return (
    <Card className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-bold leading-none ${toneCls}`}>{formatValue(value)}</p>
      {sub && <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{sub}</p>}
    </Card>
  )
}

/* ── People & access tab ─────────────────────────────────────────────────── */

function PeopleTab({ hotel }) {
  const toast = useToast()
  const [q, setQ] = useUrlState({ uq: "", upage: 1 })
  const [searchInput, setSearchInput] = useState(q.uq)
  const search = useDebouncedValue(searchInput, 400)
  const [modal, setModal] = useState(null) // 'create' | 'bulk' | {promoteUser}
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (search !== q.uq) setQ({ uq: search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const hotelId = hotelKey(hotel)

  const load = useCallback(async () => {
    if (!hotelId) return null
    return getUsers({
      page: q.upage,
      limit: 10,
      hotelId,
      search: search || undefined,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
  }, [hotelId, search, q.upage])

  const { data, loading, error, reload } = useAsyncData(load, { deps: [hotelId, search, q.upage] })
  const users = data?.users ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 10, totalPages: 1 }

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "User",
        render: (u) => {
          const uid = u.id ?? u._id
          const name = [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email
          return (
            <div className="flex items-center gap-2.5">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${avatarTone(uid)}`}>
                {getInitials(name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-800">{name}</span>
                <span className="block truncate text-[11px] text-slate-400">{u.email}</span>
              </span>
            </div>
          )
        },
      },
      {
        key: "role",
        label: "Role",
        render: (u) => (u.role ? <Tag>{u.role}</Tag> : <span className="text-slate-400">—</span>),
      },
      {
        key: "department",
        label: "Department",
        render: (u) => [u.departmentType, u.departmentRole].filter(Boolean).join(" / ") || "—",
      },
      {
        key: "status",
        label: "Status",
        render: (u) => {
          const st = userStatus(u.status)
          return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        },
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (u) => (
          <button
            type="button"
            onClick={() => {
              setResult(null)
              setModal({ promoteUser: u })
            }}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Promote / change role
          </button>
        ),
      },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={searchInput}
          onChange={setSearchInput}
          placeholder="Search users of this hotel…"
          className="w-full max-w-xs"
          label="Search hotel users"
        />
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={<IconUpload size={13} />} onClick={() => { setResult(null); setModal("bulk") }}>
            Bulk upload
          </Button>
          <Button size="sm" variant="primary" icon={<IconUserPlus size={13} />} onClick={() => { setResult(null); setModal("create") }}>
            Add hotel user
          </Button>
        </div>
      </div>

      {result && <UserOperationResult result={result} onDismiss={() => setResult(null)} />}

      <DataTable
        columns={columns}
        rows={users}
        keyField="_id"
        loading={loading}
        error={error || ""}
        onRetry={reload}
        pagination={{ page: pagination.page ?? q.upage, limit: pagination.limit ?? 10, total: pagination.total ?? 0, totalPages: pagination.totalPages, onPage: (p) => setQ({ upage: p }, { resetPage: false }) }}
        empty={{
          title: "No users in this hotel yet",
          description: "Create individual accounts or bulk-upload a CSV/XLSX to onboard this tenant's staff.",
        }}
      />

      <p className="text-[11px] text-slate-400">
        This list is scoped to the hotel via the platform user directory. Suspend/delete and profile edits happen on the
        {" "}
        <LinkButton variant="link" size="sm" to="/dashboard/users" className="h-auto px-0">
          People → Users
        </LinkButton>{" "}
        page.
      </p>

      {modal === "create" && (
        <CreateHotelUserModal
          onClose={() => setModal(null)}
          onDone={(res) => {
            setResult(res)
            setModal(null)
            reload()
          }}
          hotelId={hotelId}
        />
      )}
      {modal === "bulk" && (
        <BulkUploadModal
          onClose={() => setModal(null)}
          onDone={(res) => {
            setResult(res)
            setModal(null)
            reload()
          }}
          hotelId={hotelId}
        />
      )}
      {modal?.promoteUser && (
        <PromoteUserModal
          hotelId={hotelId}
          user={modal.promoteUser}
          onClose={() => setModal(null)}
          onDone={(res) => {
            setResult(res)
            setModal(null)
            reload()
            toast.success("User role updated")
          }}
        />
      )}
    </div>
  )
}

function UserOperationResult({ result, onDismiss }) {
  const items = Array.isArray(result?.data) ? result.data : result?.data ? [result.data] : []
  const failed = items.filter((item) => item?.success === false)
  return (
    <InlineAlert tone={failed.length ? "warning" : "success"} onDismiss={onDismiss}>
      {result?.message || "Operation completed"}
      {items.length > 0 && (
        <span className="ml-1 text-xs opacity-80">
          {items.length - failed.length} succeeded, {failed.length} failed
        </span>
      )}
    </InlineAlert>
  )
}

const EMPTY_USER_FORM = {
  email: "",
  phone: "",
  firstName: "",
  lastName: "",
  dob: "",
  role: "EMPLOYEE",
  profession: "",
  city: "",
  departmentType: "",
  departmentRole: "",
}

function CreateHotelUserModal({ hotelId, onClose, onDone }) {
  const [form, setForm] = useState(EMPTY_USER_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit() {
    if (!form.email.trim()) {
      setError("Email is required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const payload =
        compactHotelObject({
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          profession: form.profession.trim(),
          departmentType: form.departmentType,
          departmentRole: form.departmentRole,
          profile: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            dob: form.dob,
            location: { city: form.city.trim() },
          },
        }) || {}
      const result = await createHotelUsers(hotelId, payload)
      onDone(result)
    } catch (err) {
      setError(getErrorMessage(err, "Could not create the hotel user. Check the backend rules shown here."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      size="lg"
      title="Add hotel user"
      description="Creates the account inside this hotel only. The backend generates their initial password."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            Create user
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Email" required value={form.email} onChange={set("email")} id="hotel-user-email" />
        <TextField label="Phone" value={form.phone} onChange={set("phone")} />
        <TextField label="First name" value={form.firstName} onChange={set("firstName")} />
        <TextField label="Last name" value={form.lastName} onChange={set("lastName")} />
        <SelectField label="Role" value={form.role} onChange={set("role")}>
          {HOTEL_USER_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </SelectField>
        <TextField label="Profession" value={form.profession} onChange={set("profession")} />
        <SelectField label="Department type" value={form.departmentType} onChange={set("departmentType")}>
          <option value="">Not set</option>
          {DEPARTMENT_TYPE_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </SelectField>
        <SelectField label="Department role" value={form.departmentRole} onChange={set("departmentRole")}>
          <option value="">Not set</option>
          {DEPARTMENT_ROLE_OPTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </SelectField>
        <TextField label="Date of birth" type="date" value={form.dob} onChange={set("dob")} />
        <TextField label="City" value={form.city} onChange={set("city")} />
      </div>
      {error && (
        <p className="mt-4" role="alert">
          <InlineAlert tone="danger">{error}</InlineAlert>
        </p>
      )}
    </Modal>
  )
}

function BulkUploadModal({ hotelId, onClose, onDone }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function upload() {
    if (!file) return
    setUploading(true)
    setError("")
    try {
      const result = await bulkUploadHotelUsers(hotelId, file)
      onDone(result)
    } catch (err) {
      setError(getErrorMessage(err, "The file could not be uploaded."))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open
      onClose={uploading ? undefined : onClose}
      title="Bulk upload hotel users"
      description="Upload a CSV or XLSX file with one user per row; the backend validates each row and reports per-row results."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={uploading}>
            Cancel
          </Button>
          <Button variant="primary" icon={<IconUpload size={13} />} loading={uploading} disabled={!file} onClick={upload}>
            Upload file
          </Button>
        </>
      }
    >
      <input
        type="file"
        accept=".csv,.xlsx,.xls"
        aria-label="User file"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
      />
      {error && (
        <p className="mt-4">
          <InlineAlert tone="danger">{error}</InlineAlert>
        </p>
      )}
    </Modal>
  )
}

function PromoteUserModal({ hotelId, user, onClose, onDone }) {
  const [form, setForm] = useState({
    role: user.role || "MANAGER",
    departmentType: user.departmentType || "",
    departmentRole: user.departmentRole || "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    setSaving(true)
    setError("")
    try {
      const payload =
        compactHotelObject({
          role: form.role,
          departmentType: form.departmentType,
          departmentRole: form.departmentRole,
        }) || {}
      const result = await promoteHotelUser(hotelId, user.id ?? user._id, payload)
      onDone(result)
    } catch (err) {
      setError(getErrorMessage(err, "Could not update the user's role."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={saving ? undefined : onClose}
      title="Change role"
      description={`Update the department assignment for ${[user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") || user.email}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" loading={saving} onClick={submit}>
            Save role
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <SelectField
          label="Hotel role"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        >
          {HOTEL_USER_ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </SelectField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Department type"
            value={form.departmentType}
            onChange={(e) => setForm((f) => ({ ...f, departmentType: e.target.value }))}
          >
            <option value="">Keep current / not set</option>
            {DEPARTMENT_TYPE_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </SelectField>
          <SelectField
            label="Department role"
            value={form.departmentRole}
            onChange={(e) => setForm((f) => ({ ...f, departmentRole: e.target.value }))}
          >
            <option value="">Keep current / not set</option>
            {DEPARTMENT_ROLE_OPTIONS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </SelectField>
        </div>
        {error && <InlineAlert tone="danger">{error}</InlineAlert>}
      </div>
    </Modal>
  )
}

/* ── Subscription & onboarding tab ─────────────────────────────────────────── */

function BillingTab({ hotel, reload }) {
  const toast = useToast()
  const [form, setForm] = useState({ subscriptionPlan: "", subscriptionStatus: "", subscriptionExpiresAt: "" })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!hotel) return
    setForm({
      subscriptionPlan: hotel.subscriptionPlan || "",
      subscriptionStatus: hotel.subscriptionStatus || "",
      subscriptionExpiresAt: hotel.subscriptionExpiresAt ? String(hotel.subscriptionExpiresAt).slice(0, 10) : "",
    })
  }, [hotel])

  async function save() {
    setSaving(true)
    setError("")
    try {
      const payload = Object.fromEntries(
        Object.entries(form)
          .filter(([, value]) => value)
          .map(([key, value]) => [
            key,
            key === "subscriptionExpiresAt" ? new Date(`${value}T00:00:00.000Z`).toISOString() : value,
          ])
      )
      await updateHotelSubscription(hotelKey(hotel), payload)
      toast.success("Subscription updated")
      await reload()
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update subscription."))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader
          title="Commercial subscription"
          subtitle="Plan, status and renewal date for this tenant."
        />
        <CardBody>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField
              label="Plan"
              value={form.subscriptionPlan}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionPlan: e.target.value }))}
            >
              <option value="">Not set</option>
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </SelectField>
            <SelectField
              label="Status"
              value={form.subscriptionStatus}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionStatus: e.target.value }))}
            >
              <option value="">Not set</option>
              {SUBSCRIPTION_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </SelectField>
            <TextField
              label="Expires at"
              type="date"
              value={form.subscriptionExpiresAt}
              onChange={(e) => setForm((f) => ({ ...f, subscriptionExpiresAt: e.target.value }))}
            />
          </div>
          {error && <p className="mt-3"><InlineAlert tone="danger">{error}</InlineAlert></p>}
          <div className="mt-4 flex justify-end">
            <Button variant="primary" loading={saving} onClick={save}>
              Save subscription
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Onboarding" subtitle="Setup state recorded when the tenant joined." />
        <CardBody className="space-y-3">
          <DetailItem label="Initial payment" value={hotel?.initialPaymentDone ? "Done" : "Pending"} />
          <DetailItem label="Payment reference" value={hotel?.paymentId} />
          <DetailItem label="Subscription amount" value={hotel?.subscriptionAmount != null ? `Rs. ${Number(hotel.subscriptionAmount).toLocaleString("en-IN")}` : "—"} />
          <DetailItem label="Current expiry" value={formatDateTime(hotel?.subscriptionExpiresAt)} />
          <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
            Onboarding payments are settled outside Mend Admin; the platform marks this flag when the payment is verified.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}

/* ── Operations tab ───────────────────────────────────────────────────────── */

function OperationsTab({ hotel, analytics }) {
  const navigate = useNavigate()
  const attendance = analytics?.attendanceSummary ?? {}
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MiniStat label="Attendance records" value={formatValue(attendance.total)} sub="In the analytics window" />
        <MiniStat label="Geo-validated" value={formatValue(attendance.geoValidated)} sub="Checked in at site" />
        <MiniStat label="Over 10 hours" value={formatValue(attendance.exceeds10Hours)} sub="Long-shift flags" tone={Number(attendance.exceeds10Hours) > 0 ? "warning" : undefined} />
        <MiniStat label="Low recovery" value={formatValue(attendance.insufficientRecovery)} sub="Rest gap flags" tone={Number(attendance.insufficientRecovery) > 0 ? "danger" : undefined} />
      </div>

      <Card>
        <CardHeader
          title="Detailed metrics"
          subtitle="Operational analytics for this tenant — attendance rate, shifts, fatigue, jobs and certificates."
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-[13px] text-slate-500">
              Analytics are kept on a single screen so hotel-wide numbers are read in one place, scoped to this tenant.
            </p>
            <Button
              variant="secondary"
              size="sm"
              icon={<IconEye size={13} />}
              onClick={() => navigate(`/dashboard/analytics?hotel=${hotelKey(hotel)}`)}
            >
              Open scoped analytics
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
