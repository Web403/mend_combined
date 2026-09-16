import { useCallback, useEffect, useMemo, useState } from "react"
import { deleteUser, getUserProfile, getUsers, suspendUser, updateUser } from "../../api/users"
import { getHotels, hotelKey } from "../../api/hotels"
import { sendCredentials } from "../../api/credentials"
import useAsyncData from "../../hooks/useAsyncData"
import useDebouncedValue from "../../hooks/useDebouncedValue"
import useUrlState from "../../hooks/useUrlState"
import PageHeader from "../../components/ui/PageHeader"
import Button from "../../components/ui/Button"
import Card, { CardBody, CardHeader, DetailGrid, DetailItem } from "../../components/ui/Card"
import StatusBadge, { Tag } from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import Drawer from "../../components/ui/Drawer"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import Dropdown from "../../components/ui/Dropdown"
import { ActiveFilterChips, FilterSelect, SearchInput, Toolbar } from "../../components/ui/Toolbar"
import { ErrorState, InlineAlert } from "../../components/ui/States"
import { useToast } from "../../hooks/useToast"
import { getErrorMessage } from "../../api/api"
import { avatarTone, formatDate, getInitials } from "../../utils/format"
import { paymentLabel, userStatus } from "../../utils/labels"

const STATUS_OPTIONS = ["CREATED", "ACTIVE", "SUSPENDED"]
const ROLE_OPTIONS = ["ADMIN", "MANAGER", "EMPLOYEE", "HR", "STUDENT", "PROFESSIONAL"]
const PROFESSION_OPTIONS = ["Captain", "Chef", "Waiter", "Bartender", "Hostess", "Management", "Student", "Other"]
const EXP_OPTIONS = ["Less than 1 year", "1–2 years", "3–5 years", "5–10 years", "10+ years"]
const AVAIL_OPTIONS = ["Weekdays", "Weekends", "Both weekdays & weekends", "Flexible / Any time"]

const URL_DEFAULTS = {
  q: "",
  status: "",
  prof: "",
  exp: "",
  avail: "",
  hotel: "",
  sort: "createdAt",
  order: "desc",
  page: 1,
  limit: 25,
  user: "",
}

export default function UsersPage() {
  const toast = useToast()
  const [q, setQ] = useUrlState(URL_DEFAULTS)
  const [searchInput, setSearchInput] = useState(q.q)
  const search = useDebouncedValue(searchInput, 400)

  useEffect(() => {
    if (search !== q.q) setQ({ q: search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const [confirm, setConfirm] = useState(null) // {type, user}
  const [pending, setPending] = useState(false)

  // Hotel directory (for the Organization filter + name resolution).
  const loadHotels = useCallback(() => getHotels({ page: 1, limit: 200, sortBy: "name", sortOrder: "asc" }), [])
  const { data: hotelData } = useAsyncData(loadHotels)
  const hotels = useMemo(() => hotelData?.hotels ?? [], [hotelData])
  const hotelById = useMemo(() => {
    const map = new Map()
    hotels.forEach((h) => {
      map.set(String(hotelKey(h)), h)
      if (h.id) map.set(String(h.id), h)
      if (h._id) map.set(String(h._id), h)
    })
    return map
  }, [hotels])

  const load = useCallback(async () => {
    return getUsers({
      page: q.page,
      limit: q.limit,
      sortBy: q.sort,
      sortOrder: q.order,
      search: search || undefined,
      status: q.status || undefined,
      profession: q.prof || undefined,
      yearsOfExperience: q.exp || undefined,
      availability: q.avail || undefined,
      hotelId: q.hotel || undefined,
    })
  }, [JSON.stringify({ ...q, search })]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload } = useAsyncData(load)
  const users = data?.users ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: 25, totalPages: 1 }

  const chips = [
    q.status && { key: "status", label: "Status", value: q.status },
    q.prof && { key: "prof", label: "Profession", value: q.prof },
    q.exp && { key: "exp", label: "Experience", value: q.exp },
    q.avail && { key: "avail", label: "Availability", value: q.avail },
    q.hotel && { key: "hotel", label: "Hotel", value: hotelById.get(q.hotel)?.name ?? q.hotel },
  ].filter(Boolean)

  const onSort = (key) => {
    if (q.sort === key) setQ({ order: q.order === "asc" ? "desc" : "asc" }, { resetPage: false })
    else setQ({ sort: key, order: "asc" })
  }

  const selectedUserId = q.user || ""
  const clearSelection = useCallback(() => setQ({ user: "" }), [setQ])

  async function runConfirmation() {
    if (!confirm) return
    setPending(true)
    const { type, user } = confirm
    const id = user.id ?? user._id
    try {
      if (type === "credentials") {
        await sendCredentials({ userId: id })
        toast.success(`Credentials sent to ${user.email}`)
      } else if (type === "suspend") {
        await suspendUser(id)
        toast.success(`${user.email} suspended`)
        await reload()
      } else if (type === "delete") {
        await deleteUser(id)
        toast.success(`${user.email} deleted`)
        if (String(selectedUserId) === String(id)) clearSelection()
        await reload()
      }
      setConfirm(null)
    } catch (err) {
      toast.error(getErrorMessage(err, "The action failed. Your account may not have permission for it."))
    } finally {
      setPending(false)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "user",
        label: "User",
        width: "15rem",
        render: (u) => {
          const uid = u.id ?? u._id
          const name = [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(" ") || u.email
          return (
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarTone(uid)}`}>
                {getInitials(name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{name}</span>
                <span className="block truncate text-[11px] text-slate-400">{u.email}</span>
              </span>
            </div>
          )
        },
      },
      {
        key: "role",
        label: "Role",
        render: (u) => (u.role ? <Tag>{u.role}</Tag> : "—"),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (u) => {
          const st = userStatus(u.status)
          return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        },
      },
      {
        key: "profession",
        label: "Profession",
        sortable: true,
        render: (u) => (
          <span className="block">
            <span className="block truncate text-slate-700">{u.profession || "—"}</span>
            <span className="block truncate text-[11px] text-slate-400">{u.yearsOfExperience || ""}</span>
          </span>
        ),
      },
      {
        key: "hotelId",
        label: "Organization",
        render: (u) => {
          const hotel = u.hotelId ? hotelById.get(String(u.hotelId)) : null
          return hotel ? (
            <span className="truncate text-slate-700">{hotel.name}</span>
          ) : (
            <span className="text-slate-400">Platform (no hotel)</span>
          )
        },
      },
      {
        key: "payment",
        label: "Onboarding",
        render: (u) => {
          const p = paymentLabel(u.initialPaymentDone)
          return p.tone === "success" ? <span className="text-[13px] text-slate-600">Payment done</span> : <StatusBadge tone="warning">Payment due</StatusBadge>
        },
      },
      {
        key: "createdAt",
        label: "Joined",
        sortable: true,
        render: (u) => <span className="whitespace-nowrap text-slate-500">{formatDate(u.createdAt)}</span>,
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (u) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button size="xs" variant="secondary" onClick={() => setQ({ user: String(u.id ?? u._id) }, { resetPage: false })}>
              View
            </Button>
            <Dropdown
              label={`More actions for ${u.email}`}
              items={[
                { label: "Send credentials", onClick: () => setConfirm({ type: "credentials", user: u }) },
                {
                  label: "Suspend user",
                  danger: true,
                  disabled: u.status === "SUSPENDED",
                  separatorBefore: true,
                  onClick: () => setConfirm({ type: "suspend", user: u }),
                },
                {
                  label: "Delete user",
                  danger: true,
                  onClick: () => setConfirm({ type: "delete", user: u }),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [hotelById, setQ]
  )

  return (
    <div>
      <PageHeader
        title="Users"
        description="The people platform across every hotel: search a person, open their profile, manage account state."
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toolbar className="flex-1">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search name, email or phone…"
            className="w-full max-w-xs"
            label="Search users"
          />
          <FilterSelect
            label="Status"
            value={q.status}
            onChange={(v) => setQ({ status: v })}
            options={[{ value: "", label: "Any status" }, ...STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Hotel"
            value={q.hotel}
            onChange={(v) => setQ({ hotel: v })}
            options={[{ value: "", label: "All hotels" }, ...hotels.map((h) => ({ value: hotelKey(h), label: h.name }))]}
          />
          <FilterSelect
            label="Profession"
            value={q.prof}
            onChange={(v) => setQ({ prof: v })}
            options={[{ value: "", label: "Any profession" }, ...PROFESSION_OPTIONS.map((p) => ({ value: p, label: p }))]}
          />
          <FilterSelect
            label="Experience"
            value={q.exp}
            onChange={(v) => setQ({ exp: v })}
            options={[{ value: "", label: "Any experience" }, ...EXP_OPTIONS.map((e) => ({ value: e, label: e }))]}
          />
          <FilterSelect
            label="Availability"
            value={q.avail}
            onChange={(v) => setQ({ avail: v })}
            options={[{ value: "", label: "Any availability" }, ...AVAIL_OPTIONS.map((a) => ({ value: a, label: a }))]}
          />
          <ActiveFilterChips chips={chips} onRemove={(k) => setQ({ [k]: "" })} onClear={() => setQ({ status: "", prof: "", exp: "", avail: "", hotel: "" })} />
        </Toolbar>
        <p className="text-xs text-slate-400">
          {loading ? "Loading…" : `${pagination.total.toLocaleString("en-IN")} users`}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={users}
        keyField="_id"
        loading={loading}
        error={error && !data ? error : ""}
        onRetry={reload}
        sort={{ by: q.sort, order: q.order, onSort }}
        pagination={{
          page: q.page,
          limit: q.limit,
          total: pagination.total ?? 0,
          totalPages: pagination.totalPages,
          onPage: (p) => setQ({ page: p }, { resetPage: false }),
        }}
        onRowClick={(u) => setQ({ user: String(u.id ?? u._id) }, { resetPage: false })}
        empty={{
          title: "No users match these filters",
          description: "Try a different search term or clear the filters to browse the full directory.",
          action: chips.length || q.q ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSearchInput("")
                setQ({ q: "", status: "", prof: "", exp: "", avail: "", hotel: "" })
              }}
            >
              Clear filters
            </Button>
          ) : undefined,
        }}
      />

      {selectedUserId && (
        <UserDetailDrawer
          userId={selectedUserId}
          onClose={clearSelection}
          onChanged={reload}
          onConfirmAction={(type, user) => setConfirm({ type, user })}
        />
      )}

      <ConfirmDialog
        open={confirm?.type === "credentials"}
        title="Send login credentials"
        description={`An email with their access details will be sent to ${confirm?.user?.email}.`}
        confirmLabel="Send credentials"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "suspend"}
        danger
        title="Suspend user"
        description={`${confirm?.user?.email} will immediately lose access to the platform until an administrator reinstates their account.`}
        detail="Their history (attendance, enrollments, certificates) is preserved."
        confirmLabel="Suspend user"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.type === "delete"}
        danger
        requireText={confirm?.user?.email}
        title="Delete user"
        description={`${confirm?.user?.email} and their account will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete user"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}

/* ── Drawer ───────────────────────────────────────────────────────────────── */

function UserDetailDrawer({ userId, onClose, onChanged, onConfirmAction }) {
  const load = useCallback(() => getUserProfile(userId), [userId])
  const { data: user, loading, error, reload, runAction } = useAsyncData(load, { deps: [userId] })

  const name = user ? [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") || user.email : "User"

  return user ? (
    <Drawer
      open
      onClose={onClose}
      title={name}
      subtitle={user.email}
      headerExtra={
        <>
          <StatusBadge tone={userStatus(user.status).tone}>{userStatus(user.status).label}</StatusBadge>
          {user.role && <Tag>{user.role}</Tag>}
          {user.profession && <Tag>{user.profession}</Tag>}
        </>
      }
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="secondary" onClick={() => onConfirmAction("credentials", user)}>
            Send credentials
          </Button>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="dangerGhost" disabled={user.status === "SUSPENDED"} onClick={() => onConfirmAction("suspend", user)}>
              Suspend
            </Button>
            <Button size="sm" variant="dangerGhost" onClick={() => onConfirmAction("delete", user)}>
              Delete
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <AdminControls
          key={`${user.id ?? user._id}:${user.role}:${user.status}`}
          user={user}
          userId={userId}
          onChanged={onChanged}
          runAction={runAction}
        />
        <Card>
          <CardHeader title="Account" />
          <CardBody>
            <DetailGrid cols={2}>
              <DetailItem label="Email" value={user.email} />
              <DetailItem label="Phone" value={user.phone ?? user.phoneNumber ?? user.profile?.phoneNumber} />
              <DetailItem label="Platform ID" value={user.id} />
              <DetailItem label="Hotel ID" value={user.hotelId} />
              <DetailItem label="Department" value={[user.departmentType, user.departmentRole].filter(Boolean).join(" / ")} />
              <DetailItem label="Experience" value={user.yearsOfExperience} />
              <DetailItem label="Availability" value={user.availability} />
              <DetailItem label="Onboarding payment" value={user.initialPaymentDone ? "Done" : "Pending"} />
              <DetailItem label="Payment reference" value={user.paymentId} />
              <DetailItem label="Joined" value={formatDate(user.createdAt)} />
              <DetailItem label="Last updated" value={formatDate(user.updatedAt)} />
            </DetailGrid>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <DetailGrid cols={2}>
              <DetailItem label="First name" value={user.profile?.firstName} />
              <DetailItem label="Last name" value={user.profile?.lastName} />
              <DetailItem label="City" value={user.profile?.location?.city} />
              <DetailItem label="Country" value={user.profile?.location?.country} />
              <DetailItem label="Skills" value={Array.isArray(user.skills) && user.skills.length ? user.skills.join(", ") : "—"} />
              <DetailItem label="Languages" value={Array.isArray(user.profile?.languages) && user.profile.languages.length ? user.profile.languages.join(", ") : "—"} />
            </DetailGrid>
            {user.bio || user.profile?.bio ? (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-100">
                {user.bio ?? user.profile?.bio}
              </p>
            ) : null}
          </CardBody>
        </Card>
      </div>
    </Drawer>
  ) : loading ? (
    <Drawer open onClose={onClose} title="User profile" subtitle="Loading…">
      <div className="h-48 animate-pulse rounded-xl border border-slate-200 bg-white" />
    </Drawer>
  ) : error ? (
    <Drawer open onClose={onClose} title="User profile">
      <ErrorState title="We couldn't load this user" message={error} onRetry={reload} compact />
    </Drawer>
  ) : null
}

function AdminControls({ user, userId, onChanged, runAction }) {
  const toast = useToast()
  const [role, setRole] = useState(user.role || "")
  const [status, setStatus] = useState(user.status || "")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  async function save() {
    setSaving(true)
    setSaveError("")
    const payload = {}
    if (role) payload.role = role
    if (status) payload.status = status
    const result = await runAction(() => updateUser(userId, payload))
    setSaving(false)
    if (result.ok) {
      toast.success("User updated")
      onChanged?.()
    } else {
      setSaveError(result.error)
    }
  }

  return (
    <Card>
      <CardHeader
        title="Administrative controls"
        subtitle="Account state changes take effect immediately. The backend is the authority for whether you may perform them."
      />
      <CardBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Unchanged</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            >
              <option value="">Unchanged</option>
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>
          <Button variant="primary" size="md" loading={saving} onClick={save}>
            Save changes
          </Button>
        </div>
        {saveError && <p className="mt-3"><InlineAlert tone="danger">{saveError}</InlineAlert></p>}
      </CardBody>
    </Card>
  )
}
