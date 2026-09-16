import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getHotels, hotelKey, updateHotelStatus, deleteHotel } from "../../api/hotels"
import { sendCredentials } from "../../api/credentials"
import useAsyncData from "../../hooks/useAsyncData"
import useUrlState from "../../hooks/useUrlState"
import useDebouncedValue from "../../hooks/useDebouncedValue"
import PageHeader from "../../components/ui/PageHeader"
import Button, { LinkButton } from "../../components/ui/Button"
import StatusBadge from "../../components/ui/StatusBadge"
import DataTable from "../../components/ui/DataTable"
import { ActiveFilterChips, FilterSelect, SearchInput, Toolbar } from "../../components/ui/Toolbar"
import Dropdown from "../../components/ui/Dropdown"
import ConfirmDialog from "../../components/ui/ConfirmDialog"
import { useToast } from "../../hooks/useToast"
import { IconPlus } from "../../components/ui/Icons"
import { avatarTone, getInitials } from "../../utils/format"
import { hotelStatusLabel, paymentLabel, subscriptionExpiry, subscriptionStatus } from "../../utils/labels"
import {
  PAIN_POINT_OPTIONS,
  PLAN_OPTIONS,
  SUBSCRIPTION_STATUS_OPTIONS,
} from "./hotelOptions"

/** URL keys → backend sort fields (city needs the nested path). */
const SORT_FIELDS = {
  name: "name",
  city: "location.city",
  subscriptionPlan: "subscriptionPlan",
  isActive: "isActive",
  createdAt: "createdAt",
}

const URL_DEFAULTS = {
  q: "",
  city: "",
  pain: "",
  plan: "",
  sub: "",
  status: "",
  payment: "",
  sort: "createdAt",
  order: "desc",
  page: 1,
  limit: 25,
}

export default function HotelsPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useUrlState(URL_DEFAULTS)
  const [searchInput, setSearchInput] = useState(q.q)
  const search = useDebouncedValue(searchInput, 400)

  // keep the debounced search mirrored into the URL (linkable filtered views)
  useEffect(() => {
    if (search !== q.q) setQ({ q: search })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const [confirm, setConfirm] = useState(null) // {type:'credentials'|'delete'|'toggle', hotel, next}
  const [pending, setPending] = useState(false)

  const fetchKey = JSON.stringify({ ...q, search })
  const load = useCallback(async () => {
    const params = {
      page: q.page,
      limit: q.limit,
      sortBy: SORT_FIELDS[q.sort] ?? "createdAt",
      sortOrder: q.order,
      search: search || undefined,
      city: q.city || undefined,
      primaryPainPoint: q.pain || undefined,
      subscriptionPlan: q.plan || undefined,
      subscriptionStatus: q.sub || undefined,
      isActive: q.status === "active" ? "true" : q.status === "inactive" ? "false" : undefined,
      initialPaymentDone: q.payment === "paid" ? "true" : q.payment === "unpaid" ? "false" : undefined,
    }
    return getHotels(params)
  }, [fetchKey, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, reload, runAction } = useAsyncData(load)
  const hotels = data?.hotels ?? []
  const pagination = data?.pagination ?? { total: 0, page: 1, limit: q.limit, totalPages: 1 }

  const chips = [
    q.city && { key: "city", label: "City", value: q.city },
    q.pain && { key: "pain", label: "Pain point", value: q.pain },
    q.plan && { key: "plan", label: "Plan", value: q.plan },
    q.sub && { key: "sub", label: "Subscription", value: q.sub },
    q.status && { key: "status", label: "Status", value: q.status },
    q.payment && { key: "payment", label: "Payment", value: q.payment },
  ].filter(Boolean)

  function removeChip(key) {
    setQ({ [key]: "" })
  }

  const onSort = (key) => {
    if (q.sort === key) setQ({ order: q.order === "asc" ? "desc" : "asc" }, { resetPage: false })
    else setQ({ sort: key, order: "asc" })
  }

  async function runConfirmation() {
    if (!confirm) return
    setPending(true)
    const { type, hotel } = confirm
    const id = hotelKey(hotel)
    const result = await runAction(async () => {
      if (type === "credentials") return sendCredentials({ hotelId: id })
      if (type === "delete") return deleteHotel(id)
      if (type === "toggle") return updateHotelStatus(id, hotel.isActive ? false : true)
    })
    setPending(false)
    if (result.ok) {
      if (type === "credentials") toast.success(`Credentials sent to ${hotel.name}`)
      if (type === "delete") {
        toast.success(`${hotel.name} deleted`)
        reload()
      }
      if (type === "toggle") {
        toast.success(`${hotel.name} ${hotel.isActive ? "deactivated" : "activated"}`)
        await reload()
      }
      setConfirm(null)
    }
  }

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Hotel",
        sortable: true,
        width: "16rem",
        render: (h) => {
          const id = hotelKey(h)
          return (
            <div className="flex items-center gap-2.5">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${avatarTone(id)}`}>
                {getInitials(h.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-slate-900">{h.name}</span>
                <span className="block truncate text-[11px] text-slate-400">{h.email}</span>
              </span>
            </div>
          )
        },
      },
      {
        key: "city",
        label: "Location",
        sortable: true,
        render: (h) => (
          <span className="block">
            <span className="block truncate text-slate-700">{h.location?.city || "—"}</span>
            <span className="block truncate text-[11px] text-slate-400">{h.location?.state || h.location?.country || ""}</span>
          </span>
        ),
      },
      {
        key: "contact",
        label: "Contact",
        render: (h) => (
          <span className="block">
            <span className="block truncate text-slate-700">{h.contactPersonName || "—"}</span>
            <span className="block truncate text-[11px] text-slate-400">{h.phoneNumber || ""}</span>
          </span>
        ),
      },
      {
        key: "subscriptionPlan",
        label: "Plan · Subscription",
        sortable: true,
        render: (h) => {
          const sub = subscriptionStatus(h.subscriptionStatus)
          const expiry = subscriptionExpiry(h.subscriptionExpiresAt)
          return (
            <span className="block">
              <span className="flex items-center gap-1.5">
                <StatusBadge tone="info" dot={false}>{h.subscriptionPlan || "No plan"}</StatusBadge>
                <StatusBadge tone={sub.tone}>{sub.label}</StatusBadge>
              </span>
              <span className={`mt-0.5 block text-[11px] ${expiry.tone === "neutral" ? "text-slate-400" : expiry.tone === "warning" ? "font-medium text-amber-700" : "font-medium text-red-600"}`}>
                {expiry.label}
              </span>
            </span>
          )
        },
      },
      {
        key: "initialPaymentDone",
        label: "Onboarding",
        render: (h) => {
          const pay = paymentLabel(h.initialPaymentDone)
          return <StatusBadge tone={pay.tone}>{pay.label}</StatusBadge>
        },
      },
      {
        key: "isActive",
        label: "Status",
        sortable: true,
        render: (h) => {
          const st = hotelStatusLabel(h.isActive)
          return <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
        },
      },
      {
        key: "actions",
        label: "",
        align: "right",
        render: (h) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <LinkButton to={`/dashboard/hotels/${hotelKey(h)}`} size="xs" variant="secondary">
              View
            </LinkButton>
            <Dropdown
              label={`More actions for ${h.name}`}
              items={[
                { label: "Edit hotel", onClick: () => navigate(`/dashboard/hotels/${hotelKey(h)}/edit`) },
                { label: "Send credentials", onClick: () => setConfirm({ type: "credentials", hotel: h }) },
                {
                  label: h.isActive ? "Deactivate hotel" : "Activate hotel",
                  danger: h.isActive,
                  onClick: () => setConfirm({ type: "toggle", hotel: h }),
                },
                {
                  label: "Delete hotel",
                  danger: true,
                  separatorBefore: true,
                  onClick: () => setConfirm({ type: "delete", hotel: h }),
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div>
      <PageHeader
        title="Hotels"
        description="Every organization onboarded on the Mend platform: profiles, subscriptions, onboarding and tenant users."
        actions={
          <LinkButton to="/dashboard/hotels/new" variant="primary" icon={<IconPlus size={14} />}>
            Create hotel
          </LinkButton>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Toolbar className="flex-1">
          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            placeholder="Search by name, email or phone…"
            className="w-full max-w-xs"
            label="Search hotels"
          />
          <FilterSelect
            label="Status"
            value={q.status}
            onChange={(v) => setQ({ status: v })}
            options={[
              { value: "", label: "Any status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
            ]}
          />
          <FilterSelect
            label="Subscription"
            value={q.sub}
            onChange={(v) => setQ({ sub: v })}
            options={[{ value: "", label: "Any subscription" }, ...SUBSCRIPTION_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))]}
          />
          <FilterSelect
            label="Plan"
            value={q.plan}
            onChange={(v) => setQ({ plan: v })}
            options={[{ value: "", label: "Any plan" }, ...PLAN_OPTIONS.map((p) => ({ value: p, label: p }))]}
          />
          <FilterSelect
            label="Onboarding payment"
            value={q.payment}
            onChange={(v) => setQ({ payment: v })}
            options={[
              { value: "", label: "Any payment" },
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
            ]}
          />
          <FilterSelect
            label="Pain point"
            value={q.pain}
            onChange={(v) => setQ({ pain: v })}
            options={[{ value: "", label: "Any pain point" }, ...PAIN_POINT_OPTIONS.map((p) => ({ value: p, label: p }))]}
          />
          <ActiveFilterChips chips={chips} onRemove={removeChip} onClear={() => setQ({ city: "", pain: "", plan: "", sub: "", status: "", payment: "" })} />
        </Toolbar>
        <p className="text-xs text-slate-400">
          {loading ? "Loading…" : `${pagination.total.toLocaleString("en-IN")} hotel${pagination.total === 1 ? "" : "s"}`}
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={hotels}
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
        onRowClick={(h) => navigate(`/dashboard/hotels/${hotelKey(h)}`)}
        empty={{
          title: "No hotels match these filters",
          description: "Try changing your search or clearing filters — new tenants created here will also appear in this list.",
          action: chips.length || q.q ? (
            <Button size="sm" variant="secondary" onClick={() => { setSearchInput(""); setQ({ q: "", city: "", pain: "", plan: "", sub: "", status: "", payment: "" }) }}>
              Clear filters
            </Button>
          ) : (
            <LinkButton size="sm" variant="primary" to="/dashboard/hotels/new">
              Create the first hotel
            </LinkButton>
          ),
        }}
      />

      <ConfirmDialog
        open={confirm?.type === "credentials"}
        title="Send login credentials"
        description={
          confirm?.hotel
            ? `An email with their access details will be sent to ${confirm.hotel.name}. This is the only time credentials are emailed — use it deliberately.`
            : ""
        }
        confirmLabel="Send credentials"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.type === "toggle"}
        danger={Boolean(confirm?.hotel?.isActive)}
        title={confirm?.hotel?.isActive ? "Deactivate hotel" : "Activate hotel"}
        description={
          confirm?.hotel
            ? confirm.hotel.isActive
              ? `${confirm.hotel.name} and all of its users will immediately lose access to the platform. Their data is preserved and can be restored by reactivating.`
              : `${confirm.hotel.name} will regain access to the platform for all of its active users.`
            : ""
        }
        confirmLabel={confirm?.hotel?.isActive ? "Deactivate hotel" : "Activate hotel"}
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />

      <ConfirmDialog
        open={confirm?.type === "delete"}
        danger
        requireText={confirm?.hotel?.name}
        title="Delete hotel"
        description={
          confirm?.hotel
            ? `"${confirm.hotel.name}" and its tenant record will be permanently removed. Subscriptions, credentials and operational history are gone for good. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete hotel"
        busy={pending}
        onConfirm={runConfirmation}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
